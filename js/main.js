
function addToURL(value){
    if (history.pushState) {
        var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + value;
        window.history.pushState({path:newurl},'',newurl);
    }
 }

log('0xBitcoin Stats v0.0.4');

var stats_updated_count = 0;
const _BLOCKS_PER_READJUSTMENT = 1024;
const _CONTRACT_ADDRESS = "0xB6eD7644C69416d67B522e20bC294A9a9B405B31";
const _MAXIMUM_TARGET_STR = "27606985387162255149739023449108101809804435888681546220650096895197184";
const _MAXIMUM_TARGET_BN = new Eth.BN(_MAXIMUM_TARGET_STR, 10);
const _ZERO_BN = new Eth.BN(0, 10);

/* TODO: figure out why it doesn't work w metamask */
var eth = new Eth(new Eth.HttpProvider("https://mainnet.infura.io/MnFOXCPE2oOhWpOCyEBT"));
// if (typeof window.web3 !== 'undefined' && typeof window.web3.currentProvider !== 'undefined') {
//   var eth = new Eth(window.web3.currentProvider);
// } else {
//   var eth = new Eth(new Eth.HttpProvider("https://mainnet.infura.io/MnFOXCPE2oOhWpOCyEBT"));
//   log("warning: no web3 provider found, using infura.io as backup provider")
// }


const token = eth.contract(tokenABI).at(_CONTRACT_ADDRESS);

function goToURLAnchor() {
  /* kind of a hack, after charts are loaded move to correct anchor. For some
     reason the viewport is forced to the top when creating the charts */
  if (window.location.hash.search('#difficulty') != -1) {
    var targetOffset = $('#row-difficulty').offset().top;
    $('html, body').animate({scrollTop: targetOffset}, 1000);
  } else if (window.location.hash.search('#reward-time') != -1) {
    var targetOffset = $('#row-reward-time').offset().top;
    $('html, body').animate({scrollTop: targetOffset}, 1000);
  }else if (window.location.hash.search('#miners') != -1) {
    var targetOffset = $('#row-miners').offset().top;
    $('html, body').animate({scrollTop: targetOffset}, 1000);
  }else if (window.location.hash.search('#blocks') != -1) {
    var targetOffset = $('#row-blocks').offset().top;
    $('html, body').animate({scrollTop: targetOffset}, 1000);
  }else if (window.location.hash.search('#miningcalculator') != -1) {
    var targetOffset = $('#row-miningcalculator').offset().top;
    $('html, body').animate({scrollTop: targetOffset}, 1000);
  }
}


/*Helper class for loading historical data from ethereum contract variables.
  Initialize with an ethjs object, target contract address, and an integer 
  index that points to your desired variable in in the contract's storage area

  obj.addValueAtEthBlock(<block number>) starts a request to fetch
  and cache the value of your variable at that time. Note if you pass a
  non-integer block number it will be rounded.
  
  obj.areAllValuesLoaded() will return true once all fetches are complete

  obj.getValues returns all requested data
 */
class contractValueOverTime {
  constructor(eth, contract_address, storage_index) {
    this.eth = eth;
    this.contract_address = contract_address;
    this.storage_index = storage_index;
    this.sorted = false;
    this.states = [];
    /* since values are added asynchronously, we store the length we
    expect state to be once all values are pushed */
    this.expected_state_length = 0;
  }
  get getValues() {
    return this.states;
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
  addValueAtEthBlock(eth_block_num) {
    /* read value from contract @ specific block num, save to this.states

       detail: load eth provider with a request to load value from 
       block @ num. Callback is anonymous function which pushes the 
       value onto this.states */
    this.expected_state_length += 1;
    this.sorted = false;

    /* make sure we only request integer blocks */
    eth_block_num = Math.round(eth_block_num)

    log('requested', this.storage_index, '@ block', eth_block_num)

    var saveState = function(block_states, eth_block_num) {
      return function (value) {
        /* TODO: probably a way to convert w/o going through hex_str */
        //log('value:', value)
        var hex_str = value.substr(2, 64);
        var value_bn = new Eth.BN(hex_str, 16)
        // var difficulty = max_target.div(value_bn)

        // console.log("Block #", eth_block_num, ":", value);
        // log("Block #", eth_block_num, ":", difficulty.toString(10));

        /* [block num, value @ block num, timestamp of block num] */
        var len = block_states.push([eth_block_num, value_bn, '']);

        function setValue(save_fn) {
          return function(value) {
            save_fn(value);
          }
        }

        /* TODO: uncomment this to use timestamps embedded in block */
        // eth.getBlockByNumber(eth_block_num, true).then(setValue((value)=>{block_states[len-1][2]=value.timestamp.toString(10)}))

      }
    }
    this.eth.getStorageAt(this.contract_address, 
                          new Eth.BN(this.storage_index, 10),
                          eth_block_num.toString(10))
    .then(
      saveState(this.states, eth_block_num)
    ).catch((error) => {
      log('error reading block storage:', error);
    });
  }
  areAllValuesLoaded() {
    return this.expected_state_length == this.states.length;
  }
  async waitUntilLoaded() {
    while (!this.areAllValuesLoaded()) {
      //log('waiting for values to load...');
      await sleep(80);
    }
  }
  // onAllValuesLoaded(callback) {
  //   this.on_all_values_loaded_callback = callback;
  // }
  sortValues() {
    log('sorting values..');
    this.states.sort((a, b) => {
      //log('a', a[0], 'b', b[0]);
      return a[0] - b[0];
    });
    this.sorted = true;
  }
  /* iterate through already loaded values. Wherever a state change is
  seen, queue another value load from the blockchain halfway between 
  state A and state B. Goal is to get closer to the actual eth block
  number where the state transition occurs. */
  increaseTransitionResolution() {
    if(!this.sorted) {
      this.sortValues();
    }

    var last_block_number = this.states[0][0];
    var last_value = this.states[0][1];
    for(var i = 0; i < this.states.length; i++) {
      var block_number = this.states[i][0];
      var value = this.states[i][1];
      if(last_value.cmp(value) != 0) {
        this.addValueAtEthBlock(((last_block_number + block_number)/2));
      }
      last_value = value;
      last_block_number = block_number;
    }
  }
  /* iterate through already loaded values. If 3 or more repeating
  values are detected, remove all middle values so only the first and
  last state with that value remain  */
  deduplicate() {
    if(!this.sorted) {
      this.sortValues();
    }
    /* we actually go backwards so we don't screw up array indexing
    as we remove values along the way */
    for(var i = this.states.length-1; i >= 2 ; i--) {
      var v1 = this.states[i][1];
      var v2 = this.states[i-1][1];
      var v3 = this.states[i-2][1];

      if (v1.cmp(v2) == 0
          && v2.cmp(v3) == 0) {
        /* remove one item at location i-1 (middle value) */
        this.states.splice(i-1, 1);
      }
    }
  }
}






stats = [
  /*Description                     promise which retuns, or null         units         multiplier  null: filled in later*/
  //['',                              null,                                 "",           1,          null     ], /* mining difficulty */
  ['Mining Difficulty',             token.getMiningDifficulty,            "",           1,          null     ], /* mining difficulty */
  ['Estimated Hashrate',            null,                                 "Mh/s",       1,          null     ], /* mining difficulty */
  ['Rewards Until Readjustment',    null,                                 "",           1,          null     ], /* mining difficulty */
  ['Current Average Reward Time',   null,                                 "minutes",    1,          null     ], /* mining difficulty */
  ['Last Difficulty Start Block',   token.latestDifficultyPeriodStarted,  "",           1,          null     ], /* mining difficulty */
  ['Tokens Minted',                 token.tokensMinted,                   "0xBTC",      0.00000001, null     ], /* supply */
  ['Max Supply for Current Era',    token.maxSupplyForEra,                "0xBTC",      0.00000001, null     ], /* mining */
  ['Supply Remaining in Era',       null,                                 "0xBTC",      0.00000001, null     ], /* mining */
  ['Last Eth Reward Block',         token.lastRewardEthBlockNumber,       "",           1,          null     ], /* mining */
  ['Last Eth Block',                eth.blockNumber,                      "",           1,          null     ], /* mining */
  ['Current Reward Era',            token.rewardEra,                      "/ 39",       1,          null     ], /* mining */
  ['Current Mining Reward',         token.getMiningReward,                "0xBTC",      0.00000001, null     ], /* mining */
  ['Epoch Count',                   token.epochCount,                     "",           1,          null     ], /* mining */
  ['Total Supply',                  token.totalSupply,                    "0xBTC",      0.00000001, null     ], /* supply */
  ['',                              null,                                 "",           1,          null     ], /* */
  ['Token Holders',                 null,                                 "holders",    1,          null     ], /* usage */
  ['Token Transfers',               null,                                 "transfers",  1,          null     ], /* usage */
  ['Total Contract Operations',     null,                                 "txs",        1,          null     ], /* usage */
  //['',                              null,                                 "0xBTC",      0.00000001, null     ], /* */
  //['TokenMiningPool.com Hashrate',  null,                                 "Mh/s",       1,          null     ], /* pool */
  //['0xBrute.com Hashrate',          null,                                 "Mh/s",       1,          null     ], /* pool */
  //['0xPool.io Hashrate',            null,                                 "Mh/s",       1,          null     ], /* pool */
  //['gpu.PiZzA Hashrate',            null,                                 "Mh/s",       1,          null     ], /* pool */
  //['0xBTCpool.com Hashrate',        null,                                 "Mh/s",       1,          null     ], /* pool */
];

var latest_eth_block = null;
eth.blockNumber().then((value)=>{
  latest_eth_block = parseInt(value.toString(10), 10);
});
function ethBlockNumberToTimestamp(eth_block) {
  //log('converting', eth_block)
  //log('latest e', latest_eth_block)
  /* TODO: use web3 instead, its probably more accurate */
  /* blockDate = new Date(web3.eth.getBlock(startBlock-i+1).timestamp*1000); */
  return new Date(Date.now() - ((latest_eth_block - eth_block)*15*1000)).toLocaleString()
}

function toReadableThousands(num_value, should_add_b_tags) {
  units = ['', 'K', 'M', 'B'];
  var final_unit = 'T';
  for(idx in units) {
    var unit = units[idx];
    if(num_value < 1000) {
      final_unit = unit;
      break;
    } else {
      num_value /= 1000;
    }
  }
  var num_value_string = num_value.toFixed(2);
  if(should_add_b_tags) {
    num_value_string = '<b>' + num_value_string + '</b>';
  }
  return num_value_string + ' ' + final_unit;
}

function toReadableHashrate(hashrate, should_add_b_tags) {
  units = ['H/s', 'Kh/s', 'Mh/s', 'Gh/s', 'Th/s', 'Ph/s'];
  var final_unit = 'Eh/s';
  for(idx in units) {
    var unit = units[idx];
    if(hashrate < 1000) {
      final_unit = unit;
      break;
    } else {
      hashrate /= 1000;
    }
  }
  var hashrate_string = hashrate.toFixed(2);
  if(should_add_b_tags) {
    hashrate_string = '<b>' + hashrate_string + '</b>';
  }
  return hashrate_string + ' ' + final_unit;
}

function getValueFromStats(name, stats) {
  value = null
  stats.forEach(function(stat){
    if (stat[0] === name) {
      value = stat[4];
    }})
  return value
}

function setValueInStats(name, value, stats) {
  stats.forEach(function(stat){
    if (stat[0] === name) {
      stat[4] = value;
      return;
    }});
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function updateStatsThatHaveDependencies(stats) {
  /* estimated hashrate */
  difficulty = getValueFromStats('Mining Difficulty', stats)
  hashrate = difficulty * 2**22 / 600
  hashrate /= 1000000000
  el('#EstimatedHashrate').innerHTML = "<b>" + hashrate.toFixed(2) + "</b> Gh/s";

  /* supply remaining in era */
  max_supply_for_era = getValueFromStats('Max Supply for Current Era', stats)
  current_supply = getValueFromStats('Tokens Minted', stats)
  current_reward = getValueFromStats('Current Mining Reward', stats)
  supply_remaining_in_era = max_supply_for_era - current_supply; /* TODO: probably need to round to current mining reward */
  rewards_blocks_remaining_in_era = supply_remaining_in_era / current_reward;
  el('#SupplyRemaininginEra').innerHTML = "<b>" + supply_remaining_in_era.toLocaleString() + "</b> 0xBTC <span>(" + rewards_blocks_remaining_in_era + " blocks)</span>";

  /* rewards until next readjustment */
  epoch_count = getValueFromStats('Epoch Count', stats)
  rewards_since_readjustment = epoch_count % _BLOCKS_PER_READJUSTMENT
  rewards_left = _BLOCKS_PER_READJUSTMENT - rewards_since_readjustment
  el('#RewardsUntilReadjustment').innerHTML = "<b>" + rewards_left.toString(10) + "</b>";

  /* time per reward block */
  current_eth_block = getValueFromStats('Last Eth Block', stats)
  difficulty_start_eth_block = getValueFromStats('Last Difficulty Start Block', stats)

  /* time calculated using 15-second eth blocks */
  seconds_since_readjustment = (current_eth_block - difficulty_start_eth_block) * 15

  seconds_per_reward = seconds_since_readjustment / rewards_since_readjustment;
  minutes_per_reward = (seconds_per_reward / 60).toFixed(2)
  el('#CurrentAverageRewardTime').innerHTML = "<b>" + minutes_per_reward + "</b> minutes";

  /* estimated hashrate */
  difficulty = getValueFromStats('Mining Difficulty', stats)
  hashrate = difficulty * 2**22 / 600
  /* use current reward rate in hashrate calculation */
  hashrate *= (10 / minutes_per_reward)
  setValueInStats('Estimated Hashrate', hashrate, stats);
  el('#EstimatedHashrate').innerHTML = toReadableHashrate(hashrate, true);
}

function updateLastUpdatedTime() {
  var time = new Date();
  current_time = time.toLocaleTimeString();
  el('#LastUpdatedTime').innerHTML = current_time;
}

function updateThirdPartyAPIs() {
  /* ethplorer token info */
  $.getJSON('https://api.ethplorer.io/getTokenInfo/0xb6ed7644c69416d67b522e20bc294a9a9b405b31?apiKey=freekey',
    function(data) {
      el('#TokenHolders').innerHTML = "<b>" + data["holdersCount"] + "</b> holders";
      el('#TokenTransfers').innerHTML = "<b>" + data["transfersCount"] + "</b> transfers";
  });
  /* ethplorer contract address info */
  $.getJSON('https://api.ethplorer.io/getAddressInfo/0xb6ed7644c69416d67b522e20bc294a9a9b405b31?apiKey=freekey',
    function(data) {
      el('#TotalContractOperations').innerHTML = "<b>" + data["countTxs"] + "</b> txs";
  });
}

function showDifficultyGraph(eth, target_cv_obj, era_cv_obj, tokens_minted_cv_obj) {
  el('#difficultystats').innerHTML = '<canvas id="chart-hashrate-difficulty" width="10rem" height="6rem"></canvas>';
  el('#blocktimestats').innerHTML = '</canvas><canvas id="chart-rewardtime" width="10rem" height="6rem"></canvas>';
  var target_values = target_cv_obj.getValues;
  var era_values = era_cv_obj.getValues;
  var tokens_minted_values = tokens_minted_cv_obj.getValues;

  function convertValuesToChartData(values, value_mod_function) {
    var chart_data = []
    for (var i = 0; i < values.length; i++) {
      /* TODO: remove this if we expect some values to be zero */
      if(values[i][1].eq(_ZERO_BN)) {
        continue;
      }
      if(value_mod_function == undefined) {
        value_mod_function = function(v){return v};
      }
      chart_data.push({
        x: values[i][0],
        y: value_mod_function(values[i][1]),
      })
      //console.log('log', values[i][0], value_mod_function(values[i][1]))
      //labels.push(values[i][0]);
      //chart_data.push(_MAXIMUM_TARGET_BN.div(values[i][1]));
    }
    return chart_data;
  }

  function getErasPerBlockFromEraData(era_values) {
    var chart_data = []
    for (var step = 1; step < era_values.length; step++) {

      var eth_blocks_passed = era_values[step][0] - era_values[step-1][0];
      var eras_passed = era_values[step][1] - era_values[step-1][1];

      if (eth_blocks_passed == 0) {
        continue;
      }

      var eras_per_eth_block = eras_passed / eth_blocks_passed;

      chart_data.push({
        x: era_values[step][0],
        y: eras_per_eth_block,
      })
      //console.log('log', era_values[step][0], value_mod_function(era_values[step][1]))
      //labels.push(era_values[step][0]);
      //chart_data.push(_MAXIMUM_TARGET_BN.div(values[step][1]));
    }
    return chart_data;
  }

  function getHashrateDataFromDifficultyAndErasPerBlockData(difficulty_data, eras_per_block_data) {
    var expected_eras_per_block = 1/60; /* should be 60 times slower than ethereum */
    var difficulty_data_index = 0;
    var chart_data = []
    for (var step = 0; step < eras_per_block_data.length; step++) {
      var current_eth_block = eras_per_block_data[step].x;
      var current_eras_per_block = eras_per_block_data[step].y;

      while(difficulty_data_index < difficulty_data.length - 1
            && current_eth_block > difficulty_data[difficulty_data_index].x) {
        difficulty_data_index += 1;
      }
      var current_difficulty = difficulty_data[difficulty_data_index].y;

      var unadjusted_network_hashrate = current_difficulty * 2**22 / 600;

      var network_hashrate = unadjusted_network_hashrate * (current_eras_per_block/expected_eras_per_block);

      console.log('for block', current_eth_block, 'diff', current_difficulty.toString(), 'uhr', unadjusted_network_hashrate, 'hr', network_hashrate)

      chart_data.push({
        x: current_eth_block,
        y: network_hashrate,
      })
      //console.log('log', era_values[step][0], value_mod_function(era_values[step][1]))
      //labels.push(era_values[step][0]);
      //chart_data.push(_MAXIMUM_TARGET_BN.div(values[step][1]));
    }
    return chart_data;
  }

  var difficulty_data = convertValuesToChartData(target_values, 
                                                 (x)=>{return _MAXIMUM_TARGET_BN.div(x)});
  var era_data = convertValuesToChartData(era_values);
  var total_supply_data = convertValuesToChartData(tokens_minted_values, 
                                                   (x)=>{return x / 10**8});
  var eras_per_block_data = getErasPerBlockFromEraData(era_values);

  var hashrate_data = getHashrateDataFromDifficultyAndErasPerBlockData(difficulty_data, eras_per_block_data);

  var average_reward_time_data = [];
  for(var i = 0; i < eras_per_block_data.length; i += 1) {
    //console.log('calc avg reward time', eras_per_block_data[i].x, 1 / (eras_per_block_data[i].y * 4))
    average_reward_time_data.push({
      x: eras_per_block_data[i].x,
      /* 1 / (eras per block * 4 eth blocks per minute) */
      y: 1 / (eras_per_block_data[i].y * 4),
    })
  }
  // var difficulty_data = []
  // for (var i = 0; i < target_values.length; i++) {
  //   if(target_values[i][1].eq(_ZERO_BN)) {
  //     continue;
  //   }
  //   difficulty_data.push({
  //     x: target_values[i][0],
  //     y: _MAXIMUM_TARGET_BN.div(target_values[i][1]),
  //   })
  //   // labels.push(target_values[i][0]);
  //   // difficulty_data.push(_MAXIMUM_TARGET_BN.div(target_values[i][1]));
  // }
  // var era_data = []
  // for (var i = 0; i < era_values.length; i++) {
  //   if(era_values[i][1].eq(_ZERO_BN)) {
  //     continue;
  //   }
  //   difficulty_data.push({
  //     x: era_values[i][0],
  //     y: _MAXIMUM_TARGET_BN.div(era_values[i][1]),
  //   })
  //   // labels.push(era_values[i][0]);
  //   // difficulty_data.push(_MAXIMUM_TARGET_BN.div(era_values[i][1]));
  // }

  //log('textt', eth.getBlockByNumber(5000000, true).timestamp.toString());

  // function blockNumToTimeStr(block_num) {
  //   var block = await eth.getBlockByNumber(block_num, true);
  //   //log('block:', block);
  //   log('block.timestamp:', block.timestamp.toString(10));
  //   return block.timestamp.toString(10);
  // }

  /* hashrate and difficulty chart */
  var hr_diff_chart = new Chart.Scatter(document.getElementById('chart-hashrate-difficulty').getContext('2d'), {
    type: 'line',

    data: {
        datasets: [{
            label: "Difficulty",
            showLine: true,
            steppedLine: 'before',
            backgroundColor: 'rgb(255, 99, 132)',
            borderColor: 'rgb(255, 99, 132)',
            data: difficulty_data,
            fill: false,
            yAxisID: 'first-y-axis'

        },{
            label: "Network Hashrate Estimate",
            showLine: true,
            //steppedLine: 'before',
            backgroundColor: 'rgb(67, 160, 71)',
            borderColor: 'rgb(67, 160, 71)',
            data: hashrate_data,
            fill: false,
            yAxisID: 'second-y-axis'

        }]
    },

    options: {
      tooltips: {
        callbacks: {
          label: function(tooltipItem, data) {
            var label = ''

            /* Note: might have issues here if you dont set dataset label */
            label += data.datasets[tooltipItem.datasetIndex].label
            
            label += " @ Eth block #" + tooltipItem.xLabel;
            label += ' (' + ethBlockNumberToTimestamp(tooltipItem.xLabel) + ') :  ';

            if (data.datasets[tooltipItem.datasetIndex].label == "Total Supply") {
              label +=toReadableThousands(tooltipItem.yLabel);
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Network Hashrate Estimate") {
              label +=toReadableHashrate(tooltipItem.yLabel);
            } else {
              label += Math.round(tooltipItem.yLabel * 100) / 100;
            }
            //console.log(tooltipItem, data)
            return label;
          }
        }
      },
      scales: {
        xAxes: [{
          ticks: {
            // Include a dollar sign in the ticks
            callback: function(value, index, values) {
              return ethBlockNumberToTimestamp(value);
            },
            stepSize: 1000,
          }
        }],
        yAxes: [{
            id: 'first-y-axis',
            type: 'linear',
            //type: 'logarithmic',  /* hard to read */
            scaleLabel: {
              display: true,
              labelString: 'Difficulty',
            },
        }, {
            id: 'second-y-axis',
            position: 'right',
            type: 'linear',
            //type: 'logarithmic',  /* hard to read */
            scaleLabel: {
              display: true,
              labelString: 'Network Hashrate',
            },
            ticks: {
              // Include a dollar sign in the ticks
              callback: function(value, index, values) {
                return toReadableHashrate(value);
              },
              /*stepSize: 1000,*/
            }
        }]
      }
    },
    });


  /* block time chart */
  var rewardtime_chart = new Chart.Scatter(document.getElementById('chart-rewardtime').getContext('2d'), {
    type: 'line',

    data: {
        datasets: [{
            label: "Average Reward Time",
            showLine: true,
            //steppedLine: 'before',
            backgroundColor: 'rgb(1, 87, 155)',
            borderColor: 'rgb(1, 87, 155)',
            data: average_reward_time_data,
            fill: false,
            yAxisID: 'first-y-axis'

        },{
            label: "Total Supply",
            showLine: true,
            //steppedLine: 'before',
            backgroundColor: 'rgb(255, 167, 38)',
            borderColor: 'rgb(255, 167, 38)',
            data: total_supply_data,
            fill: false,
            yAxisID: 'second-y-axis'

        }]
    },

    options: {
      tooltips: {
        callbacks: {
          label: function(tooltipItem, data) {
            var label = ''

            /* Note: might have issues here if you dont set dataset label */
            label += data.datasets[tooltipItem.datasetIndex].label
            
            label += " @ Eth block #" + tooltipItem.xLabel;
            label += ' (' + ethBlockNumberToTimestamp(tooltipItem.xLabel) + ') :  ';

            if (data.datasets[tooltipItem.datasetIndex].label == "Total Supply") {
              label +=toReadableThousands(tooltipItem.yLabel);
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Network Hashrate Estimate") {
              label +=toReadableHashrate(tooltipItem.yLabel);
            } else {
              label += Math.round(tooltipItem.yLabel * 100) / 100;
            }
            //console.log(tooltipItem, data)
            return label;
          }
        }
      },
      scales: {
        xAxes: [{
          ticks: {
            // Include a dollar sign in the ticks
            callback: function(value, index, values) {
              return ethBlockNumberToTimestamp(value);
            },
            stepSize: 1000,
          }
        }],
        yAxes: [{
            id: 'first-y-axis',
            type: 'linear',
            //type: 'logarithmic',  /* hard to read */
            scaleLabel: {
              display: true,
              labelString: 'Average Reward Time (Minutes)',
            },
            ticks: {
              min: 0,
              max: 20,
            },
        }, {
            id: 'second-y-axis',
            position: 'right',
            type: 'linear',
            //type: 'logarithmic',  /* hard to read */
            scaleLabel: {
              display: true,
              labelString: 'Total 0xBitcoin',
            },
            ticks: {
              // Include a dollar sign in the ticks
              callback: function(value, index, values) {
                return toReadableThousands(value);
              },
              /*stepSize: 1000,*/
            }
        }]
      }
    },
    });

  //console.log('search', window.location.)

  goToURLAnchor();
  
}

async function refine_mining_target_values(mining_target_values){
  for (var i = 0; i < 6; i++) {
    log('increasing resolution..', i+1, '/ 6');
    await mining_target_values.waitUntilLoaded();
    mining_target_values.increaseTransitionResolution();
    /* veen though there are only 6 steps, divide by 7 so the last % shown isn't 100% (kindof misleading) */
    el('#difficultystats').innerHTML = '<div class="">Loading info from the blockchain... <span style="font-weight:600;">' + (100*(i+1)/7).toFixed(0) + '%</span></div>';
  }

  await mining_target_values.waitUntilLoaded();

  log('deduplicating..');
  mining_target_values.deduplicate();
}


async function updateDifficultyGraph(eth, num_days){
  /*
  note: this is implementation of diff. in contract:
      function getMiningDifficulty() public constant returns (uint) 
        return _MAXIMUM_TARGET.div(miningTarget);
  */
  var contract_address = '0xB6eD7644C69416d67B522e20bC294A9a9B405B31';
  var max_blocks = num_days*24*60*(60/15);
  var initial_search_points = 100; /* in some crazy world where readjustments happen every day, this will catch all changes */
  var previous = 0;
  //var current_eth_block = getValueFromStats('Last Eth Block', stats);
  var current_eth_block = parseInt((await eth.blockNumber()).toString(10), 10);

  var block_states = [];

  // var a = await eth.getStorageAt('0xB6eD7644C69416d67B522e20bC294A9a9B405B31', new Eth.BN('20', 10), 'latest');
  // var b = await eth.getStorageAt('0xB6eD7644C69416d67B522e20bC294A9a9B405B31', new Eth.BN('20', 10), 'earliest');
  // console.log(a, b);

  // 'reward era' is at location 7
  var era_values = new contractValueOverTime(eth, contract_address, '7');
  era_values.addValuesInRange((current_eth_block-max_blocks), current_eth_block, initial_search_points);

  // 'tokens minted' is at location 20
  var tokens_minted_values = new contractValueOverTime(eth, contract_address, '20');
  tokens_minted_values.addValuesInRange((current_eth_block-max_blocks), current_eth_block, initial_search_points);

  // 'mining target' is at location 11
  var mining_target_values = new contractValueOverTime(eth, contract_address, '11');
  mining_target_values.addValuesInRange((current_eth_block-max_blocks), current_eth_block, initial_search_points);
  await refine_mining_target_values(mining_target_values);



  // print all diff values to console TODO: remove
  mining_target_values.getValues.forEach((value) => {
    if(value[1] != undefined && !value[1].eq(_ZERO_BN)) {
      log('block #', value[0], 'ts', value[2], 'diff:', _MAXIMUM_TARGET_BN.div(value[1]).toString(10));
    }else{
      log('block #', value[0], 'ts', value[2], 'value[1]:', (value[1]).toString(10));
    }
  });

  /* Note: we sort these down here because we need to wait until values are
     loaded before sorting. technically we should explicitly wait, but these
     should finish long before refining the mining targets */
  era_values.sortValues();
  tokens_minted_values.sortValues();
  era_values.printValuesToLog();

  showDifficultyGraph(eth, mining_target_values, era_values, tokens_minted_values);

}


/* TODO use hours_into_past */
function updateAllMinerInfo(eth, stats, hours_into_past){

  var known_miners = {
    "0xf3243babf74ead828ac656877137df705868fd66" : [ "Token Mining Pool", "http://TokenMiningPool.com", "#FFCC80" ],
    "0x53ce57325c126145de454719b4931600a0bd6fc4" : [ "0xPool",            "http://0xPool.io",           "#B388FF" ],
    "0x98b155d9a42791ce475acc336ae348a72b2e8714" : [ "0xBTCpool",         "http://0xBTCpool.com",       "#A7FFEB" ],
    "0x363b5534fb8b5f615583c7329c9ca8ce6edaf6e6" : [ "mike.rs pool",      "http://mike.rs:3000",        "#CCFF90" ],
    "0x6917035f1deecc51fa475be4a2dc5528b92fd6b0" : [ "PiZzA pool",        "http://gpu.PiZzA",           "#FFEE58" ],
    "0x693d59285fefbd6e7be1b87be959eade2a4bf099" : [ "PiZzA pool",        "http://gpu.PiZzA",           "#FFEE58" ],
    "0x697f698dd492d71734bcaec77fd5065fa7a95a63" : [ "PiZzA pool",        "http://gpu.PiZzA",           "#FFEE58" ],
    "0x69ebd94944f0dba3e9416c609fbbe437b45d91ab" : [ "PiZzA pool",        "http://gpu.PiZzA",           "#FFEE58" ],
    "0x69b85604799d16d938835852e497866a7b280323" : [ "PiZzA pool",        "http://gpu.PiZzA",           "#FFEE58" ],
    "0x69ded73bd88a72bd9d9ddfce228eadd05601edd7" : [ "PiZzA pool",        "http://gpu.PiZzA",           "#FFEE58" ],
  }

  var last_reward_eth_block = getValueFromStats('Last Eth Reward Block', stats)
  var current_eth_block = getValueFromStats('Last Eth Block', stats)
  var estimated_network_hashrate = getValueFromStats('Estimated Hashrate', stats)
  var last_difficulty_start_block = getValueFromStats('Last Difficulty Start Block', stats)

  //var num_eth_blocks_to_search = hours_into_past * 60 * 60 / 15;
  var num_eth_blocks_to_search = last_reward_eth_block - last_difficulty_start_block;
  log("searching last", num_eth_blocks_to_search, "blocks");

  /* get all mint() transactions in the last N blocks */
  /* more info: https://github.com/ethjs/ethjs/blob/master/docs/user-guide.md#ethgetlogs */
  /* and https://ethereum.stackexchange.com/questions/12950/what-are-event-topics/12951#12951 */
  eth.getLogs({
    fromBlock: last_reward_eth_block - num_eth_blocks_to_search,
    toBlock: last_reward_eth_block,
    address: '0xB6eD7644C69416d67B522e20bC294A9a9B405B31',
    topics: ['0xcf6fbb9dcea7d07263ab4f5c3a92f53af33dffc421d9d121e1c74b307e68189d', null],
  })
  .then((result) => {
    /* array of all miner addresses */
    var miner_list = [];
    /* array of arrays of type [eth_block, txhash, miner_addr] */
    var mined_blocks = [];
    /* dict where key=miner_addr and value=total_mined_block_count */
    var miner_block_count = {};
    /* total number of blocks mined in this filter */
    var total_block_count = result.length;

    log("got filter results:", total_block_count, "transactions");

    result.forEach(function(transaction){
      function getMinerAddressFromTopic(address_from_topic) {
        return '0x' + address_from_topic.substr(26, 41);
      }
      var tx_hash = transaction['transactionHash'];
      var block_number = parseInt(transaction['blockNumber'].toString());
      var miner_address = getMinerAddressFromTopic(transaction['topics'][1].toString());

      // log('tx_hash=', tx_hash);
      // log('  block=', block_number);
      // log('  miner=', miner_address)

      if(!miner_list.includes(miner_address)){
        miner_list.push(miner_address);
      }

      mined_blocks.push([block_number, tx_hash, miner_address])

      if(miner_block_count[miner_address] === undefined) {
        miner_block_count[miner_address] = 1;
      } else {
        miner_block_count[miner_address] += 1;
      }
    });

    log("processed blocks:",
      Object.keys(miner_block_count).length,
      "unique miners");

    /* we will eventually show newest blocks first, so reverse the list */
    mined_blocks.reverse();

    /* collapse miner_block_count using known_miners who have multiple
       address into a single address */
    for(var m1 in miner_block_count) {
      for(var m2 in miner_block_count) {
        if(m1 === m2) {
          continue;
        }
        if(known_miners[m1] !== undefined
           && known_miners[m2] !== undefined
           && known_miners[m1][0] == known_miners[m2][0]) {
          miner_block_count[m1] += miner_block_count[m2];
          miner_block_count[m2] = 0;
        }
      }
    }

    /* delete miners with zero blocks (due to collapse op above) */
    Object.keys(miner_block_count).forEach((miner_addr) => {
      if(miner_block_count[miner_addr] == 0) {
        delete miner_block_count[miner_addr]
      }
    });

    /* create sorted list of miners */
    sorted_miner_block_count = []
    for(var m in miner_block_count) {
      sorted_miner_block_count.push([m, miner_block_count[m]]);
    }
    /* descending */
    sorted_miner_block_count.sort((a, b) => {return b[1] - a[1];});

    log('done sorting miner info');

    /* fill in miner info */
    var innerhtml_buffer = '<tr><th>Miner</th><th>Block Count</th>'
      + '<th>% of Total</th><th>Hashrate (Estimate)</th></tr>';
    sorted_miner_block_count.forEach(function(miner_info) {
      var addr = miner_info[0];
      var blocks = miner_info[1];

      if(known_miners[addr] !== undefined) {
        var readable_name = known_miners[addr][0];
        var address_url = known_miners[addr][1];
      } else {
        var readable_name = addr;
        var address_url = 'https://etherscan.io/address/' + addr
      }

      var percent_of_total_blocks = blocks/total_block_count;


      innerhtml_buffer += '<tr><td>'
        + '<a href="' + address_url + '">'
        + readable_name + '</a></td><td>'
        + blocks + '</td><td>'
        + (100*percent_of_total_blocks).toFixed(2) + '%' + '</td><td>'
        + toReadableHashrate(percent_of_total_blocks*estimated_network_hashrate, false) + '</td></tr>';
    });
    /* add the last row (totals) */
    innerhtml_buffer += '<tr><td style="border-bottom: 0rem;"></td><td style="border-bottom: 0rem;">'
      + total_block_count + '</td><td style="border-bottom: 0rem;"></td><td style="border-bottom: 0rem;">'
      + toReadableHashrate(estimated_network_hashrate, false) + '</td></tr>';
    el('#minerstats').innerHTML = innerhtml_buffer;
    log('done populating miner stats');
    // $(window).hide().show(0);
    // $(window).trigger('resize');

    var blocks_since_last_reward = current_eth_block - last_reward_eth_block;
    var date_now = new Date();
    var date_of_last_mint = new Date(date_now.getTime() - blocks_since_last_reward*15*1000)

    function get_date_from_eth_block(eth_block) {
      /* TODO: use web3 instead, its probably more accurate */
      /* blockDate = new Date(web3.eth.getBlock(startBlock-i+1).timestamp*1000); */
      return new Date(date_of_last_mint.getTime() - ((last_reward_eth_block - eth_block)*15*1000)).toLocaleString()
    }

    /* fill in block info */
    var dt = new Date();
    var innerhtml_buffer = '<tr><th>Time (Approx)</th><th>Eth Block #</th>'
      + '<th>Transaction Hash</th><th>Miner</th></tr>';
    mined_blocks.forEach(function(block_info) {
      var eth_block = parseInt(block_info[0]);
      var tx_hash = block_info[1];
      var addr = block_info[2];

      function simpleHash(seed, string) {
        var h = seed;
        for (var i = 0; i < string.length; i++) {
          h = ((h << 5) - h) + string[i].codePointAt();
          h &= 0xFFFFFFFF;
        }
        return h;
      }

      if(known_miners[addr] !== undefined) {
        var readable_name = known_miners[addr][0];
        var address_url = known_miners[addr][1];
        //var hexcolor = (simpleHash(0, address_url) & 0xFFFFFF) | 0x808080;
        var hexcolor = known_miners[addr][2];
      } else {
        var readable_name = addr.substr(0, 20) + '...';
        var address_url = 'https://etherscan.io/address/' + addr;
        var hexcolor = (simpleHash(0, address_url) & 0xFFFFFF) | 0x808080;
        var hexcolor = '#' + hexcolor.toString(16);
        hexcolor = hexcolor.toString(16);
      }

      var transaction_url = 'https://etherscan.io/tx/' + tx_hash;
      var block_url = 'https://etherscan.io/block/' + eth_block;

      //log('hexcolor:', hexcolor, address_url);

      innerhtml_buffer  += '<tr><td>'
        + get_date_from_eth_block(eth_block) + '</td><td>'
        + '<a href="' + block_url + '">' + eth_block + '</td><td>'
        + '<a href="' + transaction_url + '" title="' + tx_hash + '">'
        + tx_hash.substr(0, 16) + '...</a></td><td align="right" style="text-overflow:ellipsis;white-space: nowrap;overflow: hidden;">'
        + '<a href="' + address_url
        + '"><span style="background-color: ' + hexcolor + ';" class="poolname">'
        //+ '">'
        + readable_name
        + '</span></a></td></tr>';
        //+ '</a></td></tr>';
    });
    el('#blockstats').innerHTML = innerhtml_buffer;
    log('done populating block stats');

    goToURLAnchor();
  })
  .catch((error) => {
    log('error filtering txs:', error);
  });


}

function createStatsTable(){
  stats.forEach(function(stat){
    stat_name = stat[0]
    stat_function = stat[1]
    stat_unit = stat[2]
    stat_multiplier = stat[3]

    el('#statistics').innerHTML += '<tr><td>'
      + stat_name + '</td><td id="'
      + stat_name.replace(/ /g,"") + '"></td></tr>';
  });
}

function areAllBlockchainStatsLoaded(stats) {
  all_loaded = true;

  stats.forEach(function(stat){
    stat_name = stat[0]
    stat_function = stat[1]
    stat_unit = stat[2]
    stat_multiplier = stat[3]
    stat_value = stat[4]
    /* if there is a function without an associated value, we are still waiting */
    if(stat_function !== null && stat_value === null) {
      all_loaded = false;
    }
  })

  if(all_loaded) {
    return true;
  } else {
    return false;
  }
}

function updateStatsTable(stats){
  stats.forEach(function(stat){
    stat_name = stat[0]
    stat_function = stat[1]
    stat_unit = stat[2]
    stat_multiplier = stat[3]

    set_value = function(stats, stat_name, stat_unit, stat_multiplier, save_fn) {
      return function(result) {
        try {
          result = result[0].toString(10)
        } catch (err) {
          result = result.toString(10)
        }

        result = result.toString(10)*stat_multiplier
        save_fn(result)

        /* modify some of the values on display */
        if(stat_name == "Total Supply") {
          result = result.toLocaleString();
        } else if(stat_name == "Mining Difficulty"
               || stat_name == "Tokens Minted"
               || stat_name == "Max Supply for Current Era"
               || stat_name == "Supply Remaining in Era"
               || stat_name == "Token Transfers"
               || stat_name == "Total Contract Operations") {
          result = result.toLocaleString()
        }

        el('#' + stat_name.replace(/ /g,"")).innerHTML = "<b>" + result + "</b> " + stat_unit;

        /* once we have grabbed all stats, update the calculated ones */
        if(areAllBlockchainStatsLoaded(stats)) {
          updateStatsThatHaveDependencies(stats);
          setTimeout(()=>{updateAllMinerInfo(eth, stats, 24)}, 0);
        }
      }
    }
    /* run promises that store stat values */
    if(stat_function !== null) {
      stat_function().then(set_value(stats, stat_name, stat_unit, stat_multiplier, (value) => {stat[4]=value}));
    }
  });

  updateThirdPartyAPIs();
}

function updateGraphData() {
  // createStatsTable();
  // updateStatsTable(stats);
  //el('#stats-row').innerHTML = "";
  el('#row-statistics').innerHTML = ''; // may not need this
  el('#row-miners').innerHTML = ''; // may not need this
  el('#row-blocks').innerHTML = ''; // may not need this
  el('#row-miningcalculator').innerHTML = ''; // may not need this
  //showDifficultyGraph('');
  setTimeout(()=>{updateDifficultyGraph(eth, 60)}, 0); /* 60 days */
  updateLastUpdatedTime();
}

function updateAllStats() {
  el('#statistics').innerHTML = ''; // may not need this
  el('#row-difficulty').innerHTML = ''; // may not need this
  el('#row-reward-time').innerHTML = ''; // may not need this
  createStatsTable();
  updateStatsTable(stats);
  updateLastUpdatedTime();
}
