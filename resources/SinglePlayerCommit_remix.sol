/* SPDX-License-Identifier: MIT */
pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import { console } from "https://github.com/nomiclabs/hardhat/blob/master/packages/hardhat-core/console.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.1.0/contracts/access/Ownable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.1.0/contracts/token/ERC20/IERC20.sol";
import "https://github.com/smartcontractkit/chainlink/blob/master/evm-contracts/src/v0.6/ChainlinkClient.sol";
//https://github.com/smartcontractkit/chainlink/issues/3153#issuecomment-655241638
import "https://github.com/smartcontractkit/chainlink/blob/master/evm-contracts/src/v0.6/vendor/SafeMathChainlink.sol";

/// @title CommitPool single-player mode contract
/// @notice Enables staking and validating performance. No social/pool functionality.
contract SinglePlayerCommit is ChainlinkClient, Ownable {
    using SafeMathChainlink for uint256;

    /******************
    GLOBAL CONSTANTS
    ******************/
    IERC20 public token;
    uint256 BIGGEST_NUMBER = uint256(-1);
    uint256 constant private ORACLE_PAYMENT = 1 * LINK;

    /***************
    DATA TYPES
    ***************/
    /// @notice Activity as part of commitment with oracle address. E.g. "cycling" with ChainLink Strava node 
    struct Activity {
        string name;
        address oracle;
        bool allowed;
        bool exists;
    }

    struct Commitment {
        address committer; // user
        bytes32 activityKey;
        uint256 goalValue;
        uint256 startTime;
        uint256 endTime;
        uint256 stake; // amount of token staked, scaled by token decimals
        uint256 reportedValue; // as reported by oracle
        uint256 lastActivityUpdate; // when updated by oracle
        bool met; // whether the commitment has been met
        string userId;
        bool exists; // flag to help check if commitment exists
    }

    /***************
    EVENTS
    ***************/
    event NewCommitment(
        address committer,
        string activityName,
        uint256 goalValue,
        uint256 startTime,
        uint256 endTime,
        uint256 stake
    );
    event CommitmentEnded(address committer, bool met, uint256 amountPenalized);
    event Deposit(address committer, uint256 amount);
    event Withdrawal(address committer, uint256 amount);
    event RequestActivityDistanceFulfilled(
        bytes32 indexed requestId,
        uint256 indexed distance
    );
    event ActivityUpdated(
        string name, 
        bytes32 activityKey, 
        address oracle, 
        bool allowed,
        bool exists);
    //TODO Error events


    /******************
    INTERNAL ACCOUNTING
    ******************/
    mapping(bytes32 => Activity) public activities; // get Activity object based on activity key
    bytes32[] public activityKeyList; // List of activityKeys, used for indexing allowed activities

    mapping(address => Commitment) public commitments; // active commitments
    // address[] public userCommitments; // addresses with active commitments

    mapping(address => uint256) public committerBalances; // current token balances per user
    uint256 public totalCommitterBalance; // sum of current token balances
    uint256 public slashedBalance; //sum of all slashed balances

    mapping(bytes32 => address) public jobAddresses; // holds the address that ran the job

    /********
    FUNCTIONS
    ********/
    /// @notice Contract constructor used during deployment
    /// @param _activityList String list of activities reported by oracle
    /// @param _oracleAddress Address of oracle for activity data
    /// @param _token Address of <token> contract
    /// @dev Configure token address, add activities to activities mapping by calling _addActivities method
    constructor(
        string[] memory _activityList,
        address _oracleAddress,
        address _token
    ) 
        public {
            console.log("Constructor called for SinglePlayerCommit contract");
            require(_activityList.length >= 1, "SPC::constructor - activityList empty");
            token = IERC20(_token);

            _addActivities(_activityList, _oracleAddress);
    }

    // view functions
    /// @notice Get name string of activity based on key
    /// @param _activityKey Keccak256 hashed, encoded name of activity
    /// @dev Lookup in mapping and get name field
    function getActivityName(bytes32 _activityKey) public view returns (string memory activityName) {
        return activities[_activityKey].name;
    }

    // other public functions
    /// @notice Deposit amount of <token> into contract
    /// @param amount Size of deposit
    /// @dev Transfer amount to <token> contract, update balance, emit event
    function deposit(uint256 amount) public returns (bool success) {
        console.log("Received call for depositing amount %s from sender %s", amount, msg.sender);
        require(
            token.transferFrom(msg.sender, address(this), amount), 
            "SPC::deposit - token transfer failed"
        );

        _changeCommitterBalance(msg.sender, amount, true);

        emit Deposit(msg.sender, amount);

        return true;
    }

    /// @notice Public function to withdraw unstaked balance of user
    /// @param amount Amount of <token> to withdraw
    /// @dev Check balances and active stake, withdraw from balances, emit event
    function withdraw(uint256 amount) public returns (bool success) {
        console.log("Received call for withdrawing amount %s from sender %s", amount, msg.sender);
        uint256 available = committerBalances[msg.sender];
        Commitment storage commitment = commitments[msg.sender];

        if(commitment.exists == true){
            available = available.sub(commitment.stake);
        }

        require(amount <= available, "SPC::withdraw - not enough (unstaked) balance available");

        _changeCommitterBalance(msg.sender, amount, false);

        require(token.transfer(msg.sender, amount), "SPC::withdraw - token transfer failed");

        emit Withdrawal(msg.sender, amount);

        return true;
    }

    /// @notice Create commitment, store on-chain and emit event
    /// @param _activityKey Keccak256 hashed, encoded name of activity
    /// @param _goalValue Distance of activity as goal
    /// @param _startTime Starttime of commitment, also used for endTime
    /// @param _stake Amount of <token> to stake againt achieving goal
    /// @param _userId ???
    /// @dev Check parameters, create commitment, store on-chain and emit event
    function makeCommitment(
        bytes32 _activityKey,
        uint256 _goalValue,
        uint256 _startTime,
        uint256 _stake,
        string memory _userId
    ) 
        public 
        returns (bool success) 
    {
        console.log("makeCommitment called by %s", msg.sender);

        require(!commitments[msg.sender].exists, "SPC::makeCommitment - msg.sender already has a commitment");
        require(activities[_activityKey].allowed, "SPC::makeCommitment - activity doesn't exist or isn't allowed");
        require(_startTime > block.timestamp, "SPC::makeCommitment - commitment cannot start in the past");
        require(_goalValue > 1, "SPC::makeCommitment - goal is too low");
        require(committerBalances[msg.sender] >= _stake, "SPC::makeCommitment - insufficient token balance");

        uint256 endTime = _startTime.add(7 days);

        Commitment memory commitment = Commitment({
            committer: msg.sender,
            activityKey: _activityKey,
            goalValue: _goalValue,
            startTime: _startTime,
            endTime: endTime,
            stake: _stake,
            reportedValue: 0,
            lastActivityUpdate: 0,
            met: false,
            userId: _userId,
            exists: true
        });

        commitments[msg.sender] = commitment;

        emit NewCommitment(
            msg.sender, 
            activities[_activityKey].name, 
            _goalValue, 
            _startTime, 
            endTime, 
            _stake);

        return true;
    }

    /// @notice Wrapper function to deposit <token> and create commitment in one call
    /// @param _activityKey Keccak256 hashed, encoded name of activity
    /// @param _goalValue Distance of activity as goal
    /// @param _startTime Starttime of commitment, also used for endTime
    /// @param _stake Amount of <token> to stake againt achieving goale
    /// @param _depositAmount Size of deposit
    /// @param _userId ???
    /// @dev Call deposit and makeCommitment method
    function depositAndCommit(
        bytes32 _activityKey,
        uint256 _goalValue,
        uint256 _startTime,
        uint256 _stake,
        uint256 _depositAmount,
        string memory _userId
    ) 
        public 
        returns (bool success) 
    {
        require(deposit(_depositAmount), "SPC::depositAndCommit - deposit failed");
        require(makeCommitment(
                    _activityKey, 
                    _goalValue, 
                    _startTime, 
                    _stake, 
                    _userId
                ), "SPC::depositAndCommit - commitment creation failed");

        return true;
    }

    /// @notice Enables processing of open commitments after endDate that have not been processed by creator
    /// @param committer address of the creator of the committer to process
    /// @dev Process commitment by lookup based on address, checking metrics, state and updating balances
    function processCommitment(address committer) public {
        console.log("Processing commitment");
        require(commitments[committer].exists, "SPC::processCommitment - commitment does not exist");
        Commitment storage commitment = commitments[committer];

        require(commitment.endTime < block.timestamp, "SPC::processCommitment - commitment is still active");
        require(commitment.endTime < commitment.lastActivityUpdate, "SPC::processCommitment - update activity");

        require(_settleCommitment(commitment), "SPC::processCommitmentUser - settlement failed");

        emit CommitmentEnded(committer, commitment.met, commitment.stake);
    }

    /// @notice Enables control of processing own commitment. For instance when completed.
    /// @dev Process commitment by lookup msg.sender, checking metrics, state and updating balances
    function processCommitmentUser() public {
        console.log("Processing commitment");
        require(commitments[msg.sender].exists, "SPC::processCommitmentUser - commitment does not exist");
        Commitment storage commitment = commitments[msg.sender];

        require(_settleCommitment(commitment), "SPC::processCommitmentUser - settlement failed");
        emit CommitmentEnded(msg.sender, commitment.met, commitment.stake);
    }

    /// @notice Internal function for evaluating commitment and slashing funds if needed
    /// @dev Receive call with commitment object from storage
    function _settleCommitment(Commitment storage commitment) internal returns (bool success) {
        commitment.met = commitment.reportedValue >= commitment.goalValue;

        if (!commitment.met) {
            _slashFunds(commitment.stake, msg.sender);
        } 
        
        commitment.exists = false;
        return true;
    }

    /// @notice Contract owner can withdraw funds not owned by committers. E.g. slashed from failed commitments
    /// @param amount Amount of <token> to withdraw
    /// @dev Check amount against slashedBalance, transfer amount and update slashedBalance
    function ownerWithdraw(uint256 amount) public onlyOwner returns (bool success) {
        console.log("Received call for owner withdrawal for amount %s", amount);

        require(amount <= slashedBalance, "SPC::ownerWithdraw - not enough available balance");
        slashedBalance = slashedBalance.sub(amount);

        require(token.transfer(msg.sender, amount), "SPC::ownerWithdraw - token transfer failed");

        return true;
    }

    /// @notice Internal function to update balance of caller and total balance
    /// @param amount Amount of <token> to deposit/withdraw
    /// @param add Boolean toggle to deposit or withdraw
    /// @dev Based on add param add or substract amount from msg.sender balance and total committerBalance
    function _changeCommitterBalance(address committer, uint256 amount, bool add) internal returns (bool success) {
        if (add) {
            committerBalances[committer] = committerBalances[committer].add(amount);
            totalCommitterBalance = totalCommitterBalance.add(amount);
        } else {
            committerBalances[committer] = committerBalances[committer].sub(amount);
            totalCommitterBalance = totalCommitterBalance.sub(amount);
        }

        return true;
    }

    /// @notice Internal function to slash funds from user
    /// @param amount Amount of <token> to slash
    /// @param committer Address of committer
    /// @dev Substract amount from committer balance and add to slashedBalance
    function _slashFunds(uint256 amount, address committer) internal returns (bool success) {
        require(committerBalances[committer] >= amount, "SPC::_slashFunds - funds not available");
        _changeCommitterBalance(committer, amount, false);
        slashedBalance = slashedBalance.add(amount);
        return true;
    }

    // internal functions
    /// @notice Adds list of activities with oracle (i.e. datasource) to contract
    /// @param _activityList String list of activities reported by oracle
    /// @param oracleAddress Address of oracle for activity data
    /// @dev Basically just loops over _addActivity for list
    function _addActivities(string[] memory _activityList, address oracleAddress) internal {
        require(_activityList.length > 0, "SPC::_addActivities - list appears to be empty");

        for (uint256 i = 0; i < _activityList.length; i++) {
            _addActivity(_activityList[i], oracleAddress);
        }

        console.log("All provided activities added");
    }

    /// @notice Add activity to contract's activityKeyList
    /// @param _activityName String name of activity
    /// @param _oracleAddress Contract address of oracle
    /// @dev Create key from name, create activity, push to activityKeyList, return key
    function _addActivity(string memory _activityName, address _oracleAddress) 
        internal 
        returns (bytes32 activityKey) 
    {
        bytes memory activityNameBytes = bytes(_activityName);
        require(activityNameBytes.length > 0, "SPC::_addActivity - _activityName empty");

        bytes32 _activityKey = keccak256(abi.encode(_activityName));

        Activity memory activity = Activity({
            name: _activityName,
            oracle: _oracleAddress,
            allowed: true,
            exists: true
        });

        console.log(
            "Registered activity %s",
            _activityName
        );

        activities[_activityKey] = activity;
        activityKeyList.push(_activityKey); 
        emit ActivityUpdated(
            activity.name, 
            _activityKey, 
            activity.oracle, 
            activity.allowed, 
            activity.exists);
        return _activityKey;
    }

    /// @notice Function to update oracle address of existing activity
    /// @param _activityKey Keccak256 hashed, encoded name of activity
    /// @param _oracleAddress Address of oracle for activity data    
    /// @dev Check activity exists, update state, emit event
    function updateActivityOracle(bytes32 _activityKey, address _oracleAddress) 
        public
        onlyOwner 
        returns (bool success)
    {
        require(activities[_activityKey].exists, "SPC::_updateActivityOracle - activity does not exist");
        Activity storage activity = activities[_activityKey];
        activity.oracle = _oracleAddress;
        emit ActivityUpdated(
                activity.name, 
                _activityKey, 
                activity.oracle, 
                activity.allowed, 
                activity.exists
            );
        return true;
    }

    /// @notice Function to update availability of activity of existing activity
    /// @param _activityKey Keccak256 hashed, encoded name of activity
    /// @param _allowed Toggle for allowing new commitments with activity    
    /// @dev Check activity exists, update state, emit event
    function updateActivityAllowed(bytes32 _activityKey, bool _allowed) 
        public
        onlyOwner 
        returns (bool success)
    {
        require(activities[_activityKey].exists, "SPC::_updateActivityOracle - activity does not exist");
        Activity storage activity = activities[_activityKey];
        activity.allowed = _allowed;
        emit ActivityUpdated(
                activity.name, 
                _activityKey, 
                activity.oracle, 
                activity.allowed, 
                activity.exists
            );
        return true;
    }

    /// @notice Function to 'delete' an existing activity. One way function, cannot be reversed.
    /// @param _activityKey Keccak256 hashed, encoded name of activity
    /// @dev Check activity exists, update state, emit event
    function disableActivity(bytes32 _activityKey) 
        public
        onlyOwner 
        returns (bool success)
    {
        require(activities[_activityKey].exists, "SPC::_updateActivityOracle - activity does not exist");
        Activity storage activity = activities[_activityKey];
        activity.exists = false;
        emit ActivityUpdated(
                activity.name, 
                _activityKey, 
                activity.oracle, 
                activity.allowed, 
                activity.exists
            );
        return true;
    }

    //Chainlink functions
    /// @notice Call ChainLink node to report distance measured based on Strava data
    /// @param _committer Address of creator of commitment
    /// @param _oracle ChainLink oracle address
    /// @param _jobId ???
    /// @dev Async function sending request to ChainLink node
    function requestActivityDistance(address _committer, address _oracle, string memory _jobId)
        public
    {
        Commitment memory commitment = commitments[_committer];
        Chainlink.Request memory req = buildChainlinkRequest(
                                            stringToBytes32(_jobId), 
                                            address(this), 
                                            this.fulfillActivityDistance.selector
                                        );
        req.add("type", activities[commitment.activityKey].name);
        req.add("startTime", uint2str(commitment.startTime));
        req.add("endTime", uint2str(commitment.endTime));
        req.add("userId", commitment.userId);

        bytes32 requestId = sendChainlinkRequestTo(_oracle, req, ORACLE_PAYMENT);
        jobAddresses[requestId] = _committer;
    }

    /// @notice Register distance reported by ChainLink node
    /// @param _requestId ID or request triggering the method call
    /// @param _distance Distance to register
    /// @dev Follow-up function to requestActivityDistance
    function fulfillActivityDistance(bytes32 _requestId, uint256 _distance)
        public
        recordChainlinkFulfillment(_requestId)
    {
        emit RequestActivityDistanceFulfilled(_requestId, _distance);
        address userAddress = jobAddresses[_requestId];
        commitments[userAddress].reportedValue = _distance;
        commitments[userAddress].lastActivityUpdate = block.timestamp;
    }

    /// @notice Get address for ChainLink token contract
    /// @dev ChainLink contract method
    function getChainlinkToken() public view returns (address tokenAddress) {
        return chainlinkTokenAddress();
    }

    /// @notice Withdraw ChainLink token from contract to contract owner
    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
    }

    function cancelRequest(
        bytes32 _requestId,
        uint256 _payment,
        bytes4 _callbackFunctionId,
        uint256 _expiration
    )
        public
        onlyOwner
    {
        cancelChainlinkRequest(_requestId, _payment, _callbackFunctionId, _expiration);
    }

    function stringToBytes32(string memory source) private pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
        return 0x0;
        }

        assembly { // solhint-disable-line no-inline-assembly
        result := mload(add(source, 32))
        }
    }
    
    function uint2str(uint i) internal pure returns (string memory str){
        if (i == 0) return "0";
        uint j = i;
        uint length;
        while (j != 0){
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint k = length - 1;
        while (i != 0){
            bstr[k--] = byte(uint8(48 + i % 10)); 
            i /= 10;
        }
        return string(bstr);
    }
}