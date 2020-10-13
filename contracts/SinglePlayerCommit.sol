/* SPDX-License-Identifier: MIT */
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SinglePlayerCommit is Ownable {
    using SafeMath for uint256;

    /******************
    GLOBAL CONSTANTS
    ******************/
    IERC20 public token;
    uint256 BIGGEST_NUMBER = uint256(-1);

    /***************
    DATA TYPES
    ***************/
    struct Activity {
        string name; // e.g. "cycling" with list scoped to activities supported by Strava
        address oracle;
        bool allowed;
    }

    struct Commitment {
        address committer; // user
        bytes32 activityKey;
        uint256 goal;
        uint256 startTime;
        uint256 endTime;
        uint256 stake; // amount of token staked, scaled by token decimals
        bool exists; // flag to help check if commitment exists
        uint256 reportedValue; // as reported by oracle
        bool timed; //if true, take time from API. if false, use default (distance)
        bool met; // whether the commitment has been met
    }

    /***************
    EVENTS
    ***************/
    event NewCommitment(
        address committer,
        string activityName,
        uint256 goal,
        bool timed,
        uint256 startTime,
        uint256 endTime,
        uint256 stake
    );
    event CommitmentEnded(address committer, bool met, uint256 amountPenalized);
    event Deposit(address committer, uint256 amount);
    event Withdrawal(address committer, uint256 amount);

    /******************
    INTERNAL ACCOUNTING
    ******************/
    mapping(bytes32 => Activity) public allowedActivities;
    bytes32[] public activityList;

    mapping(address => Commitment) public commitments; // active commitments
    address[] public userCommitments; // addresses with active commitments

    mapping(address => uint256) public balances; // current token balances
    uint256 public committerBalance; // sum of current token balances

    /********
    FUNCTIONS
    ********/
    // constructor
    constructor(
        string[] memory _activityList,
        address _oracleAddress,
        address _token
    ) public {
        console.log("Constructor called for SinglePlayerCommit contract");
        // set up token interface
        token = IERC20(_token);
        require(_activityList.length >= 1, "SPC::constructor - activityList empty");

        // register allowed activities with corresponding oracle
        _addActivities(_activityList, _oracleAddress);
    }

    // view functions

    function getActivityName(bytes32 _activityKey) public view returns (string memory) {
        return allowedActivities[_activityKey].name;
    }

    // other public functions
    function depositAndCommit(
        bytes32 _activityKey,
        uint256 _goal,
        bool _timed,
        uint256 _startTime,
        uint256 _stake,
        uint256 _depositAmount
    ) public returns (bool) {
        require(deposit(_depositAmount), "SPC::depositAndCommit - deposit failed");
        require(makeCommitment(_activityKey, _goal, _timed, _startTime, _stake), "SPC::depositAndCommit - commitment failed");

        return true;
    }

    function deposit(uint256 amount) public returns (bool) {
        console.log("Received call for depositing amount %s from sender %s", amount, msg.sender);
        // make deposit
        require(token.transferFrom(msg.sender, address(this), amount), "SPC::deposit - token transfer failed");

        // update committer's balance
        _changeCommitterBalance(amount, true);

        emit Deposit(msg.sender, amount);

        return true;
    }

    function makeCommitment(
        bytes32 _activityKey,
        // uint256 _measureIndex, // index of the Activity.measures array
        uint256 _goal,
        bool _timed,
        uint256 _startTime,
        uint256 _stake
    ) public returns (bool) {
        console.log("makeCommitment called by %s", msg.sender);

        require(!commitments[msg.sender].exists, "SPC::makeCommitment - msg.sender already has a commitment");
        require(
            allowedActivities[_activityKey].allowed,
            "SPC::makeCommitment - activity doesn't exist or isn't allowed"
        );
        require(_startTime > block.timestamp, "SPC::makeCommitment - commitment cannot start in the past");
        require(_goal >= 1, "SPC::makeCommitment - goal is too low");
        require(balances[msg.sender] >= _stake, "SPC::makeCommitment - insufficient token balance");

        uint256 endTime = _startTime.add(7 days);

        // create commitment...
        Commitment memory commitment = Commitment({
            committer: msg.sender,
            activityKey: _activityKey,
            goal: _goal,
            timed: _timed,
            startTime: _startTime,
            endTime: endTime,
            stake: _stake,
            exists: true,
            reportedValue: 0,
            met: false
        });

        // ...and add it to storage
        commitments[msg.sender] = commitment;

        emit NewCommitment(msg.sender, allowedActivities[_activityKey].name, _goal, _timed, _startTime, endTime, _stake);

        return true;
    }

    function withdraw(uint256 amount) public returns (bool) {
        console.log("Received call for withdrawing amount %s from sender %s", amount, msg.sender);
        uint256 available = balances[msg.sender].sub(commitments[msg.sender].stake);
        require(amount >= available, "SPC::withdraw - not enough balance available");

        // remove from committer's balance
        _changeCommitterBalance(amount, false);

        require(token.transfer(msg.sender, amount), "SPC::withdraw - token transfer failed");

        emit Withdrawal(msg.sender, amount);

        return true;
    }

    // TODO
    function report() public returns (bool) {
        // get activity data from oracle
        // record activity data in commitments
        return true;
    }

    function processCommitment(address committer) public {
        console.log("Processing commitment");
        Commitment memory commitment = commitments[committer];

        // check if commitment has ended
        require(commitment.endTime < block.timestamp, "SPC::processCommitment - commitment is still active");

        bool met = commitment.met;
        uint256 stake = commitment.stake;

        // "delete" the expired commitment
        commitments[committer].exists = false;

        uint256 penalty;

        if (met) {
            penalty = 0;
        } else {
            penalty = stake;
            // remove from committer's balance
            _changeCommitterBalance(penalty, false);
        }

        emit CommitmentEnded(committer, met, penalty);
    }

    function ownerWithdraw(uint256 amount) public onlyOwner returns (bool) {
        uint256 available = token.balanceOf(address(this)).sub(committerBalance);

        require(amount <= available, "SPC::ownerWithdraw - not enough available balance");
        require(token.transfer(msg.sender, amount), "SPC::ownerWithdraw - token transfer failed");

        return true;
    }

    // internal functions
    function _addActivities(string[] memory _activityList, address oracleAddress) internal {
        uint256 arrayLength = _activityList.length;

        for (uint256 i = 0; i < arrayLength; i++) {
            _addActivity(_activityList[i], oracleAddress);
        }

        console.log("All provided activities added");
    }

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
        return _activityKey;
    }

    function _changeCommitterBalance(uint256 amount, bool add) internal returns (bool) {
        if (add) {
            // increase committer's token balance
            balances[msg.sender] = balances[msg.sender].add(amount);
            // add to total committer balance sum
            committerBalance = committerBalance.add(amount);
        } else {
            // decrease committer's token balance
            balances[msg.sender] = balances[msg.sender].sub(amount);
            // decrease total committer balance sum
            committerBalance = committerBalance.sub(amount);
        }

        return true;
    }
}