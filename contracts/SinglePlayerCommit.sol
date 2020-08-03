/* SPDX-License-Identifier: MIT */
pragma solidity ^0.6.9;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/IERC20.sol";

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
        mapping(uint256 => uint256[]) measures; // index from allowedMeasures[] => [min, max] values
        address oracle;
        bool allowed;
    }

    struct Commitment {
        address committer; // user
        uint256 activityIndex; // index from allowedActivities[]
        uint256 measureIndex; // index from allowedMeasures[]
        uint256 commitValue; // must be within range of Activity.measures[measureIndex]
        uint256 startTime;
        uint256 endTime;
        uint256 stake; // amount of token staked, scaled by token decimals
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
    Activity[] public allowedActivities; // array of eligible activities
    Measure[] public allowedMeasures; // array of eligible measures

    mapping(address => Commitment) public commitments; // active commitments
    address[] public committers; // addresses with active commitments

    mapping(address => uint256) public balances; // current token balances
    uint256 public committerBalance; // sum of current token balances

    address public owner;

    /********
    FUNCTIONS
    ********/
    // constructor
    constructor(
        string memory _activity,
        string memory _measure,
        uint256[] _minmax,
        address _oracle,
        address _token
    ) public {
        // set up token interface
        token = IERC20(_token);

        // set owner
        owner = msg.sender;

        // register measure
        measureIndex = _addMeasure(_measure);

        // register activity
        _addActivity(_activity, measureIndex, _minmax, _oracle);
    }

    // fallback function (if exists)

    // external

    // public functions
    function depositAndCommit(
        uint256 _activityIndex,
        uint256 _measureIndex,
        uint256 _goal,
        uint256 _startTime,
        uint256 _stake,
        uint256 _depositAmount
    ) public {
        require(deposit(_depositAmount), "SinglePlayerCommit::depositAndCommit - token transfer failed");

        makeCommitment(activityIndex, _measureIndex, _goal, _startTime, _stake);
    }

    function deposit(uint256 amount) public returns (bool) {
        // make deposit
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "SinglePlayerCommit::deposit - token transfer failed"
        );

        _changeCommitterBalance(amount, true);

        emit Deposit(msg.sender, amount);
    }

    function makeCommitment(
        uint256 _activityIndex,
        uint256 _measureIndex,
        uint256 _goal,
        uint256 _startTime,
        uint256 _stake
    ) public {
        require(
            commitments[msg.sender] != 0,
            "SinglePlayerCommit::makeCommitment - msg.sender already has a commitment"
        );
        require(
            allowedActivities[_activityIndex].exists,
            "SinglePlayerCommit::makeCommitment - activityIndex does not exist"
        );
        require(allowedMeasures[_measure].exists, "SinglePlayerCommit::makeCommitment - measureIndex does not exist");
        require(
            _startTime > block.timestamp,
            "SinglePlayerCommit::makeCommitment - commitment must start after creation"
        );

        uint256[] memory range = allowedActivities[_activityIndex].measures[_measureIndex];
        require(_goal >= range[0], "SinglePlayerCommit::makeCommitment - goal is too low");
        require(_goal <= range[1], "SinglePlayerCommit::makeCommitment - goal is too high");

        require(balances[msg.sender] >= _stake, "SinglePlayerCommit::makeCommitment - insufficient token balance");

        uint256 endTime = _startTime.add(7 days);

        // create commitment...
        Commitment memory commitment = Commitment({
            committer: msg.sender,
            activityIndex: _activityIndex,
            measureIndex: _measureIndex,
            start: _startTime,
            end: endTime,
            stake: _stake,
            reportedValue: 0,
            met: false
        });

        // ...and add it to storage
        commitments[msg.sender] = commitment;
        committers.push(msg.sender);

        emit NewCommitment(msg.sender, _activityIndex, _measureIndex, _startTime, endTime, _stake);
    }

    function withdraw(uint256 amount) public {
        uint256 available = balances[msg.sender].sub(commitments[msg.sender].stake);
        require(amount >= available, "SinglePlayerCommit::withdraw - not enough balance available");

        // remove from committer's balance
        _changeCommitterBalance(amount, false);

        require(token.transfer(msg.sender, amount), "SinglePlayerCommit::withdraw - token transfer failed");

        emit Withdrawal(msg.sender, amount);
    }

    // TODO
    function report() public {
        // get activity data from oracle
        // record activity data in commitments
        return;
    }

    function processCommitment(address committer) public {
        Commitment memory commitment = commitments[committer];

        // TODO: check if commitment has ended
        // uint256 end = commitment.endTime;

        bool met = commitment.met;
        uint256 stake = commitment.stake;

        // delete the expired commitment // TODO is this the right way?
        commitments[committer] = 0;
        // remove the committer from the list of committers
        committers[committer] = committers[committers.length.sub(1)];
        committers.pop();

        if (met) {
            penalty = 0;
        } else {
            penalty = stake;
            // remove from committer's balance
            _changeCommitterBalance(penalty, false);
        }

        emit CommitmentEnded(committer, met, penalty);
    }

    function processCommitments() public {
        for (uint256 i = 0; i < committers.length; i.add(1)) {
            processCommitment(committers[i]);
        }
    function ownerWithdraw(uint256 amount) public onlyOwner returns (bool) {
        uint256 available = token.balance(address(this)).sub(committerBalance);

        require(amount <= available, "SinglePlayerCommit::ownerWithdraw - not enough available balance");

        require(token.transfer(msg.sender, amount), "SinglePlayerCommit::ownerWithdraw - token transfer failed");

        return true;
    }

    function _addMeasure(string memory _name) internal returns (uint256 index) {
        Measure memory measure = Measure({ name: _name, allowed: true });
        uint256 measureIndex = allowedMeasures.length;
        allowedMeasures.push(measure);
        return measureIndex;
    }

    function _addActivity(
        string memory _name,
        uint256 _measureIndex,
        uint256[] _range,
        address _oracle
    ) internal returns (uint256 index) {
        mapping(uint256 => uint256[]) memory activity_measures;
        activity_measures[measureIndex] = _minmax;

        Activity memory activity = Activity({
            name: _name,
            measures: activity_measures,
            oracle: _oracle,
            allowed: true
        });

        uint256 activityIndex = allowedMeasures.length;
        allowedActivities.push(activity);

        return activityIndex;
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
