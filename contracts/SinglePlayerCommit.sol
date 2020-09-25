/* SPDX-License-Identifier: MIT */
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

//TODO Activity deployed in test now only has name/oracle/allowed initialized 
//TODO Do we want console.log logging by buidler? Which level?

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
    struct Measure {
        string name;
        bool allowed;
    }

    struct Activity {
        string name; // e.g. "cycling"
        bytes32[] measures; // keys from allowedMeasures
        uint256[2][] ranges; // array of [min,max] goal values
        address oracle;
        bool allowed;
    }

    struct Commitment {
        address committer; // user
        bytes32 activity; // key from allowedActivities
        bytes32 measure; // key from allowedMeasures
        uint256 goalValue; // must be within range of Activity.measures[measureIndex]
        uint256 start;
        uint256 end;
        uint256 stake; // amount of token staked, scaled by token decimals
        bool exists; // flag to help check if commitment exists
        uint256 reportedValue; // as reported by oracle
        bool met; // whether the commitment has been met
    }

    /***************
    EVENTS
    ***************/
    event NewCommitment(
        address committer,
        string activity,
        string measure,
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

    mapping(bytes32 => Measure) public allowedMeasures;
    bytes32[] public measureList;

    mapping(address => Commitment) public commitments; // active commitments
    // address[] public committers; // addresses with active commitments

    mapping(address => uint256) public balances; // current token balances
    uint256 public committerBalance; // sum of current token balances

    /********
    FUNCTIONS
    ********/
    // constructor
    constructor(
        string memory _activity,
        string[] memory _measures,
        uint256[2][] memory _ranges,
        address _oracle,
        address _token
    ) public {
        // set up token interface
        token = IERC20(_token);

        // need to create fixed length bytes32 array to pass to _addActivity
        uint256 len = _measures.length;
        bytes32[] memory measureKeys = new bytes32[](len);

        // register measures
        for (uint256 i = 0; i < len; i++) {
            // register the measure
            bytes32 measureKey = _addMeasure(_measures[i]);
            // add its key to the array to be passed to _addActivity
            measureKeys[i] = measureKey;
        }

        // register activity
        _addActivity(_activity, measureKeys, _ranges, _oracle);
    }

    // fallback function (if exists)
    // TODO

    // view functions

    function getActivityName(bytes32 _activityKey) public view returns (string memory) {
        return allowedActivities[_activityKey].name;
    }

    function getActivityMeasures(bytes32 _activityKey) public view returns (string[] memory measureNames) {
        bytes32[] memory measures = allowedActivities[_activityKey].measures;
        uint256 len = measures.length;
        measureNames = new string[](len);
        for (uint256 i = 0; i < len; i++) {
            measureNames[i] = getMeasureName(measures[i]);
        }

        return measureNames;
    }

    function getMeasureName(bytes32 _measureKey) public view returns (string memory) {
        return allowedMeasures[_measureKey].name;
    }

    // other public functions
    function depositAndCommit(
        bytes32 _activity,
        uint256 _measureIndex,
        uint256 _goal,
        uint256 _startTime,
        uint256 _stake,
        uint256 _depositAmount
    ) public returns (bool) {
        require(deposit(_depositAmount), "SPC::depositAndCommit - deposit failed");

        require(
            makeCommitment(_activity, _measureIndex, _goal, _startTime, _stake),
            "SPC::depositAndCommit - commitment failed"
        );

        return true;
    }

    function deposit(uint256 amount) public returns (bool) {
        // make deposit
        require(token.transferFrom(msg.sender, address(this), amount), "SPC::deposit - token transfer failed");

        // update committer's balance
        _changeCommitterBalance(amount, true);

        emit Deposit(msg.sender, amount);

        return true;
    }

    function makeCommitment(
        bytes32 _activity,
        uint256 _measureIndex, // index of the Activity.measures array
        uint256 _goal,
        uint256 _startTime,
        uint256 _stake
    ) public returns (bool) {
        require(!commitments[msg.sender].exists, "SPC::makeCommitment - msg.sender already has a commitment");
        require(allowedActivities[_activity].allowed, "SPC::makeCommitment - activity doesn't exist or isn't allowed");

        bytes32 measure = allowedActivities[_activity].measures[_measureIndex];

        require(allowedMeasures[measure].allowed, "SPC::makeCommitment - measure doesn't exist or isn't allowed");
        require(_startTime > block.timestamp, "SPC::makeCommitment - commitment cannot start in the past");

        uint256[2] storage range = allowedActivities[_activity].ranges[_measureIndex];
        require(_goal >= range[0], "SPC::makeCommitment - goal is too low");
        require(_goal <= range[1], "SPC::makeCommitment - goal is too high");

        require(balances[msg.sender] >= _stake, "SPC::makeCommitment - insufficient token balance");

        uint256 endTime = _startTime.add(7 days);

        // create commitment...
        Commitment memory commitment = Commitment({
            committer: msg.sender,
            activity: _activity,
            measure: measure,
            goalValue: _goal,
            start: _startTime,
            end: endTime,
            stake: _stake,
            exists: true,
            reportedValue: 0,
            met: false
        });

        // ...and add it to storage
        commitments[msg.sender] = commitment;
        // committers.push(msg.sender);

        emit NewCommitment(
            msg.sender,
            allowedActivities[_activity].name,
            allowedMeasures[measure].name,
            _startTime,
            endTime,
            _stake
        );

        return true;
    }

    function withdraw(uint256 amount) public returns (bool) {
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
        Commitment memory commitment = commitments[committer];

        // check if commitment has ended
        require(commitment.end < block.timestamp, "SPC::processCommitment - commitment is still active");

        bool met = commitment.met;
        uint256 stake = commitment.stake;

        // "delete" the expired commitment
        commitments[committer].exists = false;
        // remove the committer from the list of committers
        // committers[committer] = committers[committers.length.sub(1)];
        // committers.pop();

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

    // function processCommitments() public returns (bool) {
    //     for (uint256 i = 0; i < committers.length; i.add(1)) {
    //         processCommitment(committers[i]);
    //     }

    //     return true;
    // }

    function ownerWithdraw(uint256 amount) public onlyOwner returns (bool) {
        uint256 available = token.balanceOf(address(this)).sub(committerBalance);

        require(amount <= available, "SPC::ownerWithdraw - not enough available balance");

        require(token.transfer(msg.sender, amount), "SPC::ownerWithdraw - token transfer failed");

        return true;
    }

    // internal functions

    function _addMeasure(string memory _name) internal returns (bytes32 measureKey) {
        Measure memory measure = Measure({ name: _name, allowed: true });

        measureKey = keccak256(abi.encode(_name));
        allowedMeasures[measureKey] = measure;
        measureList.push(measureKey);

        return measureKey;
    }

    function _addActivity(
        string memory _name,
        bytes32[] memory _measures,
        uint256[2][] memory _ranges,
        address _oracle
    ) internal returns (bytes32 activityKey) {
        uint256 measuresLength = _measures.length;
        require(measuresLength == _ranges.length, "SPC::_addActivity - measures and ranges must have same length");

        Activity memory activity;

        activity.name = _name;
        activity.oracle = _oracle;
        activity.measures = _measures;
        activity.ranges = _ranges;
        activity.allowed = true;

        activityKey = keccak256(abi.encode(_name));
        allowedActivities[activityKey] = activity;
        activityList.push(activityKey);

        return activityKey;
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
