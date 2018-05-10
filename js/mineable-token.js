
class mineableToken {
  constructor(eth, contract_address) {
    this._eth = eth;
    this._contract_address = contract_address;
    this._token = eth.contract(tokenABI).at(contract_address);
  }
  get getValues() {
    return this.states;
  }
  get getDifficulty() {
    return this._difficulty;
  }
  get getLatestDifficultyPeriodStarted() {
    return this._latestDifficultyPeriodStarted;
  }
  get getTokensMinted() {
    return this._tokensMinted;
  }
  get getMaxSupplyForEra() {
    return this._maxSupplyForEra;
  }
  get getLastRewardEthBlockNumber() {
    return this._lastRewardEthBlockNumber;
  }
  get getRewardEra() {
    return this._rewardEra;
  }
  get getMiningReward() {
    return this._getMiningReward;
  }
  get getEpochCount() {
    return this._epochCount;
  }
  get getTotalSupply() {
    return this._totalSupply;
  }
  printValuesToLog() {
    this.states.forEach((value) => {
      log('block #', value[0], 'ts', value[2], 'value[1]:', (value[1]).toString(10));
    });
  }
  /* fetch query_count states between start_block_num and end_block_num */
  addValuesInRange(start_block_num, end_block_num, query_count) {
    var stepsize = (end_block_num-start_block_num) / query_count;

    for (var count = 0; count < query_count; count += 1) {
      this.addValueAtEthBlock(end_block_num - (stepsize*count));
    }
  }