/* SPDX-License-Identifier: MIT */
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";
//https://github.com/smartcontractkit/chainlink/issues/3153#issuecomment-655241638
import "@chainlink/contracts/src/v0.6/vendor/SafeMath.sol";

/// @title CommitPool single-player mode contract
/// @notice Enables staking and validating performance. No social/pool functionality.
contract SinglePlayerCommit is ChainlinkClient, Ownable {
    using SafeMath for uint256;

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
    }

    struct Commitment {
        address committer; // user
        bytes32 activityKey;
        uint256 goalValue;
        uint256 startTime;
        uint256 endTime;
        uint256 stake; // amount of token staked, scaled by token decimals
        bool exists; // flag to help check if commitment exists
        uint256 reportedValue; // as reported by oracle
        bool met; // whether the commitment has been met
        string userId;
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
    event ActivityUpdated(string name, bytes32 activityKey, address oracle, bool allowed);


    /******************
    INTERNAL ACCOUNTING
    ******************/
    mapping(bytes32 => Activity) public allowedActivities;
    bytes32[] public activityList;

    mapping(address => Commitment) public commitments; // active commitments
    address[] public userCommitments; // addresses with active commitments

    mapping(address => uint256) public balances; // current token balances
    //TODO Keep track of staked balances

    uint256 public committerBalance; // sum of current token balances

    mapping(bytes32 => address) public jobAddresses; // holds the address that ran the job

    //TODO Maybe move this information to the Commitment and update the reportedValue?
    //mapping(address => uint256) public addressDistances; // holds the distance covered by this address

    /********
    FUNCTIONS
    ********/
    /// @notice Contract constructor used during deployment
    /// @param _activityList String list of activities reported by oracle
    /// @param _oracleAddress Address of oracle for activity data
    /// @param _token Address of <token> contract
    /// @dev Configure token address, add activities to activityList mapping by calling _addActivities method
    constructor(
        string[] memory _activityList,
        address _oracleAddress,
        address _token
    ) public {
        console.log("Constructor called for SinglePlayerCommit contract");
        token = IERC20(_token);
        require(_activityList.length >= 1, "SPC::constructor - activityList empty");

        _addActivities(_activityList, _oracleAddress);
    }

    // view functions
    /// @notice Get name string of activity based on key
    /// @param _activityKey Keccak256 hashed, encoded name of activity
    /// @dev Lookup in mapping and get name field
    function getActivityName(bytes32 _activityKey) public view returns (string memory) {
        return allowedActivities[_activityKey].name;
    }

    // other public functions
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
    ) public returns (bool) {
        require(deposit(_depositAmount), "SPC::depositAndCommit - deposit failed");
        require(makeCommitment(_activityKey, _goalValue, _startTime, _stake, _userId), "SPC::depositAndCommit - commitment failed");

        return true;
    }

    /// @notice Deposit amount of <token> into contract
    /// @param amount Size of deposit
    /// @dev Transfer amount to <token> contract, update balance, emit event
    function deposit(uint256 amount) public returns (bool) {
        console.log("Received call for depositing amount %s from sender %s", amount, msg.sender);
        require(token.transferFrom(msg.sender, address(this), amount), "SPC::deposit - token transfer failed");

        _changeCommitterBalance(amount, true);

        emit Deposit(msg.sender, amount);

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
    ) public returns (bool) {
        console.log("makeCommitment called by %s", msg.sender);

        require(!commitments[msg.sender].exists, "SPC::makeCommitment - msg.sender already has a commitment");
        require(
            allowedActivities[_activityKey].allowed,
            "SPC::makeCommitment - activity doesn't exist or isn't allowed"
        );
        require(_startTime > block.timestamp, "SPC::makeCommitment - commitment cannot start in the past");
        require(_goalValue > 1, "SPC::makeCommitment - goal is too low");
        require(balances[msg.sender] >= _stake, "SPC::makeCommitment - insufficient token balance");

        uint256 endTime = _startTime.add(7 days);

        Commitment memory commitment = Commitment({
            committer: msg.sender,
            activityKey: _activityKey,
            goalValue: _goalValue,
            startTime: _startTime,
            endTime: endTime,
            stake: _stake,
            exists: true,
            reportedValue: 0,
            met: false,
            userId: _userId
        });

        commitments[msg.sender] = commitment;

        emit NewCommitment(msg.sender, allowedActivities[_activityKey].name, _goalValue, _startTime, endTime, _stake);

        return true;
    }

    /// @notice Withdraw unstaked balance for user
    /// @param amount Amount of <token> to withdraw
    /// @dev Check balances, withdraw from balances, emit event
    function withdraw(uint256 amount) public returns (bool) {
        console.log("Received call for withdrawing amount %s from sender %s", amount, msg.sender);
        //TODO check if an active commitment exists
        //TODO if no commitment, balances can be withdrawn to 0
        uint256 available = balances[msg.sender].sub(commitments[msg.sender].stake);
        require(amount >= available, "SPC::withdraw - not enough balance available");

        _changeCommitterBalance(amount, false);

        require(token.transfer(msg.sender, amount), "SPC::withdraw - token transfer failed");

        emit Withdrawal(msg.sender, amount);

        return true;
    }

    /// @notice Enables processing of open commitments after endDate that have not been processed by creator
    /// @param committer address of the creator of the committer to process
    /// @dev Process commitment by lookup based on address, checking metrics, state and updating balances
    function processCommitment(address committer) public {
        console.log("Processing commitment");
        Commitment memory commitment = commitments[committer];

        require(commitment.endTime < block.timestamp, "SPC::processCommitment - commitment is still active");

        commitment.met = commitment.reportedValue > commitment.goalValue;

        if (!commitment.met) {
            _changeCommitterBalance(commitment.stake, false);
        } 
        
        commitment.exists = false;
        emit CommitmentEnded(committer, commitment.met, commitment.stake);
    }

    /// @notice Enables control of processing own commitment. For instance when completed.
    /// @dev Process commitment by lookup msg.sender, checking metrics, state and updating balances
    function processCommitmentUser() public {
        console.log("Processing commitment");
        address committer = msg.sender;
        Commitment memory commitment = commitments[committer];

        commitment.met = commitment.reportedValue > commitment.goalValue;

        if (!commitment.met) {
            _changeCommitterBalance(commitment.stake, false);
        } 
        
        commitment.exists = false;
        emit CommitmentEnded(committer, commitment.met, commitment.stake);
    }

    /// @notice Contract owner can withdraw funds not owned by committers. E.g. slashed from failed commitments
    /// @param amount Amount of <token> to withdraw
    function ownerWithdraw(uint256 amount) public onlyOwner returns (bool) {
        //TODO Require check for committerbalance compared to contractBalance
        uint256 available = token.balanceOf(address(this)).sub(committerBalance);

        require(amount <= available, "SPC::ownerWithdraw - not enough available balance");
        require(token.transfer(msg.sender, amount), "SPC::ownerWithdraw - token transfer failed");

        return true;
    }

    // internal functions
    /// @notice Adds list of activities with oracle (i.e. datasource) to contract
    /// @param _activityList String list of activities reported by oracle
    /// @param oracleAddress Address of oracle for activity data
    /// @dev Basically just loops over _addActivity for list
    function _addActivities(string[] memory _activityList, address oracleAddress) internal {
        uint256 arrayLength = _activityList.length;

        for (uint256 i = 0; i < arrayLength; i++) {
            _addActivity(_activityList[i], oracleAddress);
        }

        console.log("All provided activities added");
    }

    /// @notice Add activity to contract's activityList
    /// @param _activityName String name of activity
    /// @param _oracleAddress Contract address of oracle
    /// @dev Create key from name, create activity, push to activityList, return key
    function _addActivity(string memory _activityName, address _oracleAddress) internal returns (bytes32 activityKey) {
        bytes memory activityNameBytes = bytes(_activityName);
        require(activityNameBytes.length > 0, "SPC::_addActivity - _activityName empty");

        bytes32 _activityKey = keccak256(abi.encode(_activityName));

        Activity storage activity = allowedActivities[_activityKey];
        activity.name = _activityName;
        activity.oracle = _oracleAddress;
        activity.allowed = true;

        console.log(
            "Registered activity %s, oracle %s, allowed %s",
            allowedActivities[_activityKey].name,
            allowedActivities[_activityKey].oracle,
            allowedActivities[_activityKey].allowed
        );

        activityList.push(_activityKey);
        emit ActivityUpdated(activity.name, _activityKey, activity.oracle, activity.allowed);
        return _activityKey;
    }

    //TODO Update activity state method (oracle and/or allowed). Note: emit event
    //function _updateActivityOracle(addres oracleAddress) onlyOwner 

    //function _updateActivityAllowed(bool allowed) onlyOwner

    /// @notice Internal function to update balance of caller and total balance
    /// @param amount Amount of <token> to deposit/withdraw
    /// @param add Boolean toggle to deposit or withdraw
    /// @dev Based on add param add or substract amount from msg.sender balance and total committerBalance
    function _changeCommitterBalance(uint256 amount, bool add) internal returns (bool) {
        if (add) {
            balances[msg.sender] = balances[msg.sender].add(amount);
            committerBalance = committerBalance.add(amount);
        } else {
            balances[msg.sender] = balances[msg.sender].sub(amount);
            committerBalance = committerBalance.sub(amount);
        }

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
        Chainlink.Request memory req = buildChainlinkRequest(stringToBytes32(_jobId), address(this), this.fulfillActivityDistance.selector);
        req.add("type", allowedActivities[commitment.activityKey].name);
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
    }

    /// @notice Get address for ChainLink token contract
    /// @dev ChainLink contract method
    function getChainlinkToken() public view returns (address) {
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