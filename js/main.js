
function addToURL(value){
  if (history.pushState) {
    var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + value;
    window.history.pushState({path:newurl},'',newurl);
  }
}

const version = "v0.1.0";

log('0xBitcoin Stats', version);
el('#footerversion').innerHTML = version;


/* intrinsic values */
const _SECONDS_PER_ETH_BLOCK = 12;
const _ZERO_BN = new Eth.BN(0, 10);

/* contract constants */
/* todo: pull these from the contract */
/* todo: move these into some kind of contract helper class */
const _CONTRACT_NAME = "0xBitcoin";
const _CONTRACT_SYMBOL = "0xBTC";
const _BLOCKS_PER_READJUSTMENT = 1024;
const _CONTRACT_ADDRESS = "0xB6eD7644C69416d67B522e20bC294A9a9B405B31";
const _MINT_TOPIC = "0xcf6fbb9dcea7d07263ab4f5c3a92f53af33dffc421d9d121e1c74b307e68189d";
const _MAXIMUM_TARGET_STR = "27606985387162255149739023449108101809804435888681546220650096895197184";  // 2**234
const _MINIMUM_TARGET = 2**16;
const _ETH_BLOCKS_PER_REWARD = 60;
const _HASHRATE_MULTIPLIER = 2**22; /* TODO: calculate this from max_target (https://en.bitcoin.it/wiki/Difficulty) */
/* contract variable storage locations */
const _LAST_DIFF_START_BLOCK_INDEX = '6';
const _ERA_INDEX = '7';
const _TOKENS_MINTED_INDEX = '20';
const _MINING_TARGET_INDEX = '11';
/* calculated contract values */
const _MAXIMUM_TARGET_BN = new Eth.BN(_MAXIMUM_TARGET_STR, 10);
const _MINIMUM_TARGET_BN = new Eth.BN(_MINIMUM_TARGET);
const _IDEAL_BLOCK_TIME_SECONDS = _ETH_BLOCKS_PER_REWARD * _SECONDS_PER_ETH_BLOCK;

/* TODO: figure out why it doesn't work w metamask */
var eth = new Eth(new Eth.HttpProvider("https://eth-mainnet.g.alchemy.com/v2/2WwnRwjB8EhiTtHk9RNfyOcr5hWq2rpA"));
// if (typeof window.web3 !== 'undefined' && typeof window.web3.currentProvider !== 'undefined') {
//   var eth = new Eth(window.web3.currentProvider);
// } else {
//   var eth = new Eth(new Eth.HttpProvider("https://mainnet.infura.io/MnFOXCPE2oOhWpOCyEBT"));
//   log("warning: no web3 provider found, using infura.io as backup provider")
// }
var _BLOCK_EXPLORER_ADDRESS_URL = 'https://etherscan.io/address/';
var _BLOCK_EXPLORER_TX_URL = 'https://etherscan.io/tx/';
var _BLOCK_EXPLORER_BLOCK_URL = 'https://etherscan.io/block/';

/* colors used by pool names. todo: move to css, still use them for chart.js */
var pool_colors = {
  orange      : "#C64500",
  purple      : "#4527A0", // note: purple looks a lot like blue
  blue        : "#0277BD",
  green       : "#2E7D32",
  yellow      : "#997500",
  darkpurple  : "#662354",
  darkred     : "hsl(356, 48%, 30%)",
  teal        : "#009688",
  red         : "#f44336",
  slate       : "#34495e",
  brightred   : "#C62828",
  royal       : "#0070bc",
  pink        : "#EC407A",
  grey        : "#78909c",

  /* colors below here are not assigned yet */
  lightpurple : "#9c27b0",
  lime        : "#cddc39",
  brown       : "#8d6e63",
}

var known_miners = {
  "0xf3243babf74ead828ac656877137df705868fd66" : [ "Token Mining Pool", "http://TokenMiningPool.com",     pool_colors.orange ],
  "0xf118fde3f634e5c47638030ab0514debf39465d1" : [ "Token Mining Pool", "http://TokenMiningPool.com",     pool_colors.orange ], // mint helper contract (old)
  "0xeabe48908503b7efb090f35595fb8d1a4d55bd66" : [ "Token Mining Pool", "http://TokenMiningPool.com",     pool_colors.orange ], // mint helper contract
  "0x53ce57325c126145de454719b4931600a0bd6fc4" : [ "0xPool",            "http://0xPool.io",               pool_colors.purple ], // closed sometime 2018
  "0x98b155d9a42791ce475acc336ae348a72b2e8714" : [ "0xBTCpool",         "http://0xBTCpool.com",           pool_colors.blue ],
  "0x363b5534fb8b5f615583c7329c9ca8ce6edaf6e6" : [ "mike.rs pool",      "http://mike.rs",                 pool_colors.green ],
  "0x50212e78d96a183f415e1235e56e64416d972e93" : [ "mike.rs pool",      "http://mike.rs",                 pool_colors.green ], // mint helper contract
  "0x02c8832baf93380562b0c8ce18e2f709d6514c60" : [ "mike.rs pool B",    "http://b.mike.rs",               pool_colors.green ],
  "0x8dcee1c6302232c4cc5ce7b5ee8be16c1f9fd961" : [ "Mine0xBTC",         "http://mine0xbtc.eu",            pool_colors.darkpurple ],
  "0x20744acca6966c0f45a80aa7baf778f4517351a4" : [ "PoolOfD32th",       "http://0xbtc.poolofd32th.club",  pool_colors.darkred ],
  "0xd4ddfd51956c19f624e948abc8619e56e5dc3958" : [ "0xMiningPool",      "http://0xminingpool.com/",       pool_colors.teal ],
  "0x88c2952c9e9c56e8402d1b6ce6ab986747336b30" : [ "0xbtc.wolfpool.io", "http://wolfpool.io/",            pool_colors.red ],
  "0x540d752a388b4fc1c9deeb1cd3716a2b7875d8a6" : [ "tosti.ro",          "http://0xbtc.tosti.ro/",               pool_colors.slate ],
  "0xbbdf0402e51d12950bd8bbd50a25ed1aba5615ef" : [ "ExtremeHash",       "http://0xbtc.extremehash.io/",   pool_colors.brightred ],
  "0x7d28994733e6dbb93fc285c01d1639e3203b54e4" : [ "Wutime.com",        "http://wutime.com/",             pool_colors.royal ],
  "0x02e03db268488716c161721663501014fa031250" : [ "xb.veo.network",    "https://xb.veo.network:2096/",   pool_colors.pink ],
  "0xbf39de3c506f1e809b4e10e00dd22eb331abf334" : [ "xb.veo.network",    "https://xb.veo.network:2096/",   pool_colors.pink ],
  "0x5404bd6b428bb8e326880849a61f0e7443ef5381" : [ "666pool",           "http://0xbtc.666pool.cn/",       pool_colors.grey ],
  "0x7d3ebd2b56651d164fc36180050e9f6f7b890e9d" : [ "MVIS Mining Pool",  "http://mvis.ca",                 pool_colors.blue ],  // added 2020-02-23
  "0xd3e89550444b7c84e18077b9cbe3d4e3920f257d" : [ "0xPool",            "https://0xpool.me/", pool_colors.purple ], // added 2021-12-28, its a combo 0xBTC + BNBTC pool
  "0x6917035f1deecc51fa475be4a2dc5528b92fd6b0" : [ "PiZzA pool",        "http://gpu.PiZzA",               pool_colors.yellow ],
  "0x693d59285fefbd6e7be1b87be959eade2a4bf099" : [ "PiZzA pool",        "http://gpu.PiZzA",               pool_colors.yellow ],
  "0x697f698dd492d71734bcaec77fd5065fa7a95a63" : [ "PiZzA pool",        "http://gpu.PiZzA",               pool_colors.yellow ],
  "0x69ebd94944f0dba3e9416c609fbbe437b45d91ab" : [ "PiZzA pool",        "http://gpu.PiZzA",               pool_colors.yellow ],
  "0x69b85604799d16d938835852e497866a7b280323" : [ "PiZzA pool",        "http://gpu.PiZzA",               pool_colors.yellow ],
  "0x69ded73bd88a72bd9d9ddfce228eadd05601edd7" : [ "PiZzA pool",        "http://gpu.PiZzA",               pool_colors.yellow ],
}





const token = eth.contract(tokenABI).at(_CONTRACT_ADDRESS);

function goToURLAnchor() {
  /* kind of a hack, after charts are loaded move to correct anchor. For some
     reason the viewport is forced to the top when creating the charts */
  if (window.location.hash.search('#difficulty') != -1) {
    // this one isn't really necessary because diffigulty graph is at top of screen
    //var targetOffset = $('#row-difficulty').offset().top;
    //$('html, body').animate({scrollTop: targetOffset}, 500);
  } else if (window.location.hash.search('#reward-time') != -1) {
    var targetOffset = $('#row-reward-time').offset().top;
    $('html, body').animate({scrollTop: targetOffset}, 500);
  }else if (window.location.hash.search('#miners') != -1) {
    var targetOffset = $('#row-miners').offset().top;
    $('html, body').animate({scrollTop: targetOffset}, 500);
  }else if (window.location.hash.search('#blocks') != -1) {
    var targetOffset = $('#row-blocks').offset().top;
    $('html, body').animate({scrollTop: targetOffset}, 500);
  }else if (window.location.hash.search('#miningcalculator') != -1) {
    // not necessary; calc is at top of screen
    //var targetOffset = $('#row-miningcalculator').offset().top;
    //$('html, body').animate({scrollTop: targetOffset}, 500);
  }
}

function downloadTextAsFile(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}


function calculateNewMiningDifficulty(current_difficulty,
                                      eth_blocks_since_last_difficulty_period,
                                      epochs_mined) {
  var current_mining_target = _MAXIMUM_TARGET_BN.div(new Eth.BN(current_difficulty));
  var eth_blocks_since_last_difficulty_period = new Eth.BN(eth_blocks_since_last_difficulty_period);
  var epochs_mined = new Eth.BN(epochs_mined);

  var target_eth_blocks_since_last_difficulty_period = epochs_mined.mul(new Eth.BN(60));

  if (target_eth_blocks_since_last_difficulty_period == 0) {
    return 0;
  }

  if(eth_blocks_since_last_difficulty_period.lt(target_eth_blocks_since_last_difficulty_period)) {
    //console.log('harder');
    var excess_block_pct = (target_eth_blocks_since_last_difficulty_period.mul(new Eth.BN(100))).div( eth_blocks_since_last_difficulty_period );
    var excess_block_pct_extra = excess_block_pct.sub(new Eth.BN(100));
    if (excess_block_pct_extra.gt(new Eth.BN(1000))) {
      excess_block_pct_extra = new Eth.BN(1000);
    }
    // If there were 5% more blocks mined than expected then this is 5.  If there were 100% more blocks mined than expected then this is 100.
    //make it harder
    var new_mining_target = current_mining_target.sub(current_mining_target.div(new Eth.BN(2000)).mul(excess_block_pct_extra));   //by up to 50 %
  }else{
    //console.log('easier');
    var shortage_block_pct = (eth_blocks_since_last_difficulty_period.mul(new Eth.BN(100))).div( target_eth_blocks_since_last_difficulty_period );
    var shortage_block_pct_extra = shortage_block_pct.sub(new Eth.BN(100));
    if (shortage_block_pct_extra.gt(new Eth.BN(1000))) {
      shortage_block_pct_extra = new Eth.BN(1000); //always between 0 and 1000
    }
    //make it easier
    var new_mining_target = current_mining_target.add(current_mining_target.div(new Eth.BN(2000)).mul(shortage_block_pct_extra));   //by up to 50 %
  }

  /* never gunna happen, probably. */
  if(new_mining_target.lt(_MINIMUM_TARGET_BN)) //very difficult
  {
    //console.log('hit minimum');
    new_mining_target = _MINIMUM_TARGET_BN;
  }
  if(new_mining_target.gt(_MAXIMUM_TARGET_BN)) //very easy
  {
    //console.log('hit maximum');
    new_mining_target = _MAXIMUM_TARGET_BN;
  }

  /* return difficulty as an integer */
  return parseInt(_MAXIMUM_TARGET_BN.div(new_mining_target).toString(10));
}


/* move fetching/storing stats into a class, even just to wrap it */
stats = [
  /*Description                     promise which retuns, or null         units               multiplier  null: filled in later*/
  ['Mining Difficulty',             token.getMiningDifficulty,            "",                 1,          null     ], /* mining difficulty */
  ['Estimated Hashrate',            null,                                 "Mh/s",             1,          null     ], /* mining difficulty */
  ['Rewards Until Readjustment',    null,                                 "",                 1,          null     ], /* mining difficulty */
  ['Current Average Reward Time',   null,                                 "minutes",          1,          null     ], /* mining difficulty */
  ['Last Difficulty Start Block',   token.latestDifficultyPeriodStarted,  "",                 1,          null     ], /* mining difficulty */
  ['Tokens Minted',                 token.tokensMinted,                   _CONTRACT_SYMBOL,   0.00000001, null     ], /* supply */
  ['Max Supply for Current Era',    token.maxSupplyForEra,                _CONTRACT_SYMBOL,   0.00000001, null     ], /* mining */
  ['Supply Remaining in Era',       null,                                 _CONTRACT_SYMBOL,   0.00000001, null     ], /* mining */
  ['Inflation per Year',            null,                                 "",                 1,          null     ], /* inflation */
  ['Inflation Percentage per Year', null,                                 "",                 1,          null     ], /* inflation */
  ['Last Eth Reward Block',         token.lastRewardEthBlockNumber,       "",                 1,          null     ], /* mining */
  ['Last Eth Block',                eth.blockNumber,                      "",                 1,          null     ], /* mining */
  ['Current Reward Era',            token.rewardEra,                      "/ 39",             1,          null     ], /* mining */
  ['Current Mining Reward',         token.getMiningReward,                _CONTRACT_SYMBOL,   0.00000001, null     ], /* mining */
  ['Epoch Count',                   token.epochCount,                     "",                 1,          null     ], /* mining */
  ['Total Supply',                  token.totalSupply,                    _CONTRACT_SYMBOL,   0.00000001, null     ], /* supply */
  ['',                              null,                                 "",                 1,          null     ], /* */
  ['Token Holders',                 null,                                 "holders",          1,          null     ], /* usage */
  ['Token Transfers',               null,                                 "transfers",        1,          null     ], /* usage */
  ['Total Contract Operations',     null,                                 "txs",              1,          null     ], /* usage */
];

var latest_eth_block = null;
eth.blockNumber().then((value)=>{
  latest_eth_block = parseInt(value.toString(10), 10);
  log('loaded latest_eth_block:', latest_eth_block);
});
function ethBlockNumberToDateStr(eth_block) {
  //log('converting', eth_block)
  //log('latest e', latest_eth_block)
  /* TODO: use web3 instead, its probably more accurate */
  /* blockDate = new Date(web3.eth.get bBlock(startBlock-i+1).timestamp*1000); */
  return new Date(Date.now() - ((latest_eth_block - eth_block)*_SECONDS_PER_ETH_BLOCK*1000)).toLocaleDateString()
}
function ethBlockNumberToTimestamp(eth_block) {
  //log('converting', eth_block)
  //log('latest e', latest_eth_block)
  /* TODO: use web3 instead, its probably more accurate */
  /* blockDate = new Date(web3.eth.getBlock(startBlock-i+1).timestamp*1000); */
  return new Date(Date.now() - ((latest_eth_block - eth_block)*_SECONDS_PER_ETH_BLOCK*1000)).toLocaleString()
}


/* convert seconds to a short readable string ("1.2 hours", "5.9 months") */
function secondsToReadableTime(seconds) {
  if(seconds <= 0) {
    return "0 seconds";
  }

  units = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'];
  divisors = [365.25*24*60*60, 30.4*24*60*60, 24*60*60, 60*60, 60, 1]
  for(idx in units) {
    var unit = units[idx];
    var divisor = divisors[idx];
    if(seconds > divisor) {
      return (seconds / divisor).toFixed(1) + ' ' + unit;
    }
  }
  return seconds.toFixed(1) + ' ' + 'seconds';
}

/* convert number to a short readable string ("244.5 K", "1.2 G") */
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

  if(num_value_string.endsWith('.00')) {
    num_value_string = num_value.toFixed(0);
  }

  if(should_add_b_tags) {
    num_value_string = '<b>' + num_value_string + '</b>';
  }
  return num_value_string + ' ' + final_unit;
}

/* convert number to a readable string ("244 Thousand", "3 Billion") */
function toReadableThousandsLong(num_value, should_add_b_tags) {
  units = ['', 'Thousand', 'Million', 'Billion'];
  var final_unit = 'Trillion';
  for(idx in units) {
    var unit = units[idx];
    if(num_value < 1000) {
      final_unit = unit;
      break;
    } else {
      num_value /= 1000;
    }
  }
  if(num_value < 10) {
    var num_value_string = num_value.toFixed(1); 
  } else {
    var num_value_string = num_value.toFixed(0); 
  }
  if(should_add_b_tags) {
    num_value_string = '<b>' + num_value_string + '</b>';
  }
  return num_value_string + ' ' + final_unit;
}

/* convert number to a readable hashrate string ("244.32 Gh/s", "3.05 Th/s") */
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

  if(hashrate_string.endsWith('.00')) {
    hashrate_string = hashrate.toFixed(0);
  }

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

/* sleep for given number of milliseconds. note: must be called with 'await' */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function updateStatsThatHaveDependencies(stats) {
  /* estimated hashrate */
  difficulty = getValueFromStats('Mining Difficulty', stats)
  if(mining_calculator_app) {
    mining_calculator_app.setCurrentDifficulty(difficulty);
    mining_calculator_app.useCurrentDiff();
  }

  /* supply remaining in era */
  max_supply_for_era = getValueFromStats('Max Supply for Current Era', stats)
  current_supply = getValueFromStats('Tokens Minted', stats)
  current_reward = getValueFromStats('Current Mining Reward', stats)
  if(mining_calculator_app) {
    mining_calculator_app.setBlockReward(current_reward);
  }
  supply_remaining_in_era = max_supply_for_era - current_supply; /* TODO: probably need to round to current mining reward */
  rewards_blocks_remaining_in_era = supply_remaining_in_era / current_reward;
  el_safe('#SupplyRemaininginEra').innerHTML = "<b>" + supply_remaining_in_era.toLocaleString() + "</b> " + _CONTRACT_SYMBOL + " <span style='font-size:0.8em;'>(" + rewards_blocks_remaining_in_era + " blocks)</span>";

  /* time until next epoch ('halvening') */
  el_safe('#CurrentRewardEra').innerHTML += " <span style='font-size:0.8em;'>(next era: ~" + secondsToReadableTime(rewards_blocks_remaining_in_era * _IDEAL_BLOCK_TIME_SECONDS) + ")</div>";

  /* rewards until next readjustment */
  epoch_count = getValueFromStats('Epoch Count', stats)
  rewards_since_readjustment = epoch_count % _BLOCKS_PER_READJUSTMENT
  rewards_left = _BLOCKS_PER_READJUSTMENT - rewards_since_readjustment
  el_safe('#RewardsUntilReadjustment').innerHTML = "<b>" + rewards_left.toString(10) + "</b>";

  /* time per reward block */
  current_eth_block = getValueFromStats('Last Eth Block', stats)
  difficulty_start_eth_block = getValueFromStats('Last Difficulty Start Block', stats)

  /* Add timestamp to 'Last difficulty start block' stat */
  el_safe('#LastDifficultyStartBlock  ').innerHTML += "<span style='font-size:0.8em;'>(" + ethBlockNumberToTimestamp(difficulty_start_eth_block) + ")</span>";

  /* time calculated using 15-second eth blocks */
  var eth_blocks_since_last_difficulty_period = current_eth_block - difficulty_start_eth_block;
  var seconds_since_readjustment = eth_blocks_since_last_difficulty_period * _SECONDS_PER_ETH_BLOCK

  seconds_per_reward = seconds_since_readjustment / rewards_since_readjustment;
  el_safe('#CurrentAverageRewardTime').innerHTML = "<b>" + (seconds_per_reward / 60).toFixed(2) + "</b> minutes";
  /* add a time estimate to RewardsUntilReadjustment */
  el_safe('#RewardsUntilReadjustment').innerHTML += "  <span style='font-size:0.8em;'>(~" + secondsToReadableTime(rewards_left*seconds_per_reward) + ")</span>";

  /* calculate next difficulty */
  var new_mining_difficulty = calculateNewMiningDifficulty(difficulty,
                                                           eth_blocks_since_last_difficulty_period,
                                                           rewards_since_readjustment);
  el_safe('#MiningDifficulty').innerHTML += "  <span style='font-size:0.8em;'>(next: ~" + new_mining_difficulty.toLocaleString() + ")</span>";
  if(mining_calculator_app) {
    mining_calculator_app.setNextDifficulty(new_mining_difficulty);
  }

  /* estimated hashrate */
  hashrate = difficulty * _HASHRATE_MULTIPLIER / _IDEAL_BLOCK_TIME_SECONDS;
  /* use current reward rate in hashrate calculation */
  hashrate *= (_IDEAL_BLOCK_TIME_SECONDS / seconds_per_reward);
  setValueInStats('Estimated Hashrate', hashrate, stats);
  el_safe('#EstimatedHashrate').innerHTML = toReadableHashrate(hashrate, true);
  
  /* inflation calculation */
  sec_until_halvening = rewards_blocks_remaining_in_era * seconds_per_reward;
  /* calculate the # of years remaining until the next halving */
  ratio_until_halvening =  sec_until_halvening / 60 * 60 * 24 * 365;
  if(ratio_until_halvening>1){
    ratio_until_halvening=1;
  }
  /* calculate number of tokens issued this year at current issuance rate */
  amt1 = (60*60*24*365 / seconds_per_reward * ratio_until_halvening * current_reward);
  /* if halvening this year, calc number of tokens issued this year at post-halvening issuance rate */
  amt2 =  (60*60*24*365 / seconds_per_reward * (1-ratio_until_halvening) * current_reward / 2);
  console.log("AMT1: ", amt1);
  console.log("AMT12: ", amt2);
  el_safe('#InflationperYear').innerHTML = "<b>" + (amt1+amt2).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }) + "</b> 0xBitcoin";
  el_safe('#InflationPercentageperYear').innerHTML = "<b>" + ((100 * ( amt1+amt2)) / (current_supply + amt1 + amt2)).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  }) + "</b> %";

  
}



function updateLastUpdatedTime() {
  var time = new Date();
  current_time = time.toLocaleTimeString();
  el('#LastUpdatedTime').innerHTML = current_time;
}

function updateThirdPartyAPIs() {
  /* ethplorer token info */
  $.getJSON('https://api.ethplorer.io/getTokenInfo/' + _CONTRACT_ADDRESS + '?apiKey=freekey',
    function(data) {
      el('#TokenHolders').innerHTML = "<b>" + data["holdersCount"] + "</b> holders";
      el('#TokenTransfers').innerHTML = "<b>" + data["transfersCount"] + "</b> transfers";
  });
  /* ethplorer contract address info */
  $.getJSON('https://api.ethplorer.io/getAddressInfo/' + _CONTRACT_ADDRESS + '?apiKey=freekey',
    function(data) {
      el('#TotalContractOperations').innerHTML = "<b>" + data["countTxs"] + "</b> txs";
  });
}

function showBlockDistributionPieChart(piechart_dataset, piechart_labels) {
  //console.log('dataset', piechart_dataset);
  el('#blockdistributionpiechart').innerHTML = '<canvas id="chart-block-distribution" width="2rem" height="2rem"></canvas>';

  if(piechart_dataset.length == 0 || piechart_labels.length == 0) {
    return;
  }

  //Chart.defaults.global.elements.arc.backgroundColor = 'rgba(255,0,0,1)';
  Chart.defaults.global.elements.arc.borderColor = 'rgb(32, 34, 38)';
  Chart.defaults.global.elements.arc.borderWidth = 3;

  /* hashrate and difficulty chart */
  var hr_diff_chart = new Chart(document.getElementById('chart-block-distribution').getContext('2d'), {
    type: 'doughnut',

    data: {
        datasets: [piechart_dataset],
        labels: piechart_labels,
    },

    options: {
      legend: {
        display: false,
      },
    },
  });
}

function getMinerColor(address, known_miners) {
  function simpleHash(seed, string) {
    var h = seed;
    for (var i = 0; i < string.length; i++) {
      h = ((h << 5) - h) + string[i].codePointAt();
      h &= 0xFFFFFFFF;
    }
    return h;
  }

  if(known_miners[address] !== undefined) {
    var hexcolor = known_miners[address][2];
  } else {
    hexcolor = 'hsl(' + (simpleHash(2, address) % 360) + ', 48%, 30%)';
  }
  return hexcolor;
}

function getMinerName(address, known_miners) {
  if(known_miners[address] !== undefined) {
    return known_miners[address][0];
  } else {
    return address.substr(0, 14) + '...';
  }
}

function getMinerNameLinkHTML(address, known_miners) {
  var hexcolor = getMinerColor(address, known_miners);
  var poolstyle = '<span style="background-color: ' + hexcolor + ';" class="poolname">';

  if(known_miners[address] !== undefined) {
    var readable_name = known_miners[address][0];
    var address_url = known_miners[address][1];
  } else {
    var readable_name = address.substr(0, 14) + '...';
    var address_url = _BLOCK_EXPLORER_ADDRESS_URL + address;
  }

  return '<a href="' + address_url + '">' + poolstyle + readable_name + '</span></a>';
}

function getMinerAddressFromTopic(topic) {
  return '0x' + topic.substr(26, 41);
}

/* TODO use hours_into_past */
function updateAllMinerInfo(eth, stats, hours_into_past){
  log('updateAllMinerInfo');

  /* array of arrays of type [eth_block, txhash, miner_addr] */
  var mined_blocks = [];
  /* dict where key=miner_addr and value=total_mined_block_count */
  var miner_block_count = {};
  /* total number of blocks mined since last difficulty adjustment */
  var total_block_count = 0;
  var last_imported_mint_block = 0;

  var last_reward_eth_block = getValueFromStats('Last Eth Reward Block', stats)
  var current_eth_block = getValueFromStats('Last Eth Block', stats)
  var estimated_network_hashrate = getValueFromStats('Estimated Hashrate', stats)
  var last_difficulty_start_block = getValueFromStats('Last Difficulty Start Block', stats)

  // check to see if the browser has any data in localStorage we can use.
  // don't use the data, though, if it's from an old difficulty period
  try {
    var last_diff_block_storage = Number(localStorage.getItem('lastDifficultyStartBlock'));
    last_imported_mint_block = Number(localStorage.getItem('lastMintBlock'));
    var mint_data = localStorage.getItem('mintData');

    if (mint_data !== null && last_diff_block_storage == last_difficulty_start_block) {
      mined_blocks = JSON.parse(mint_data);
      total_block_count = mined_blocks.length;
      log('imported', total_block_count, 'transactions from localStorage');
      mined_blocks.forEach(function(mintData) {
        if (miner_block_count[mintData[2]] === undefined) {
          miner_block_count[mintData[2]] = 1;
        } else {
          miner_block_count[mintData[2]]++;
        }
      });
    }
  } catch (err) {
    log('error reading from localStorage:', err.message);
    last_imported_mint_block = 0;
    mined_blocks.length = 0;
  }

  var start_log_search_at = Math.max(last_difficulty_start_block, last_imported_mint_block + 1);
  if(last_reward_eth_block - start_log_search_at < 1){
    last_reward_eth_block = last_reward_eth_block + 2
    start_log_search_at = last_reward_eth_block - 1
  }

  log("searching last", last_reward_eth_block - start_log_search_at, "blocks");

  /* get all mint() transactions in the last N blocks */
  /* more info: https://github.com/ethjs/ethjs/blob/master/docs/user-guide.md#ethgetlogs */
  /* and https://ethereum.stackexchange.com/questions/12950/what-are-event-topics/12951#12951 */
  eth.getLogs({
    fromBlock: start_log_search_at,
    toBlock: last_reward_eth_block,
    address: _CONTRACT_ADDRESS,
    topics: [_MINT_TOPIC, null],
  })
  .then((result) => {

    log("got filter results:", result.length, "transactions");
    total_block_count += result.length;

    result.forEach(function(transaction){
      var tx_hash = transaction['transactionHash'];
      var block_number = parseInt(transaction['blockNumber'].toString());
      var miner_address = getMinerAddressFromTopic(transaction['topics'][1].toString());

      // log('tx_hash=', tx_hash);
      // log('  block=', block_number);
      // log('  miner=', miner_address)

      mined_blocks.unshift([block_number, tx_hash, miner_address])

      if(miner_block_count[miner_address] === undefined) {
        miner_block_count[miner_address] = 1;
      } else {
        miner_block_count[miner_address] += 1;
      }
    });

    if (result.length > 0) {
      localStorage.setItem('mintData', JSON.stringify(mined_blocks));
      localStorage.setItem('lastMintBlock', mined_blocks[0][0]);
      localStorage.setItem('lastDifficultyStartBlock', last_difficulty_start_block.toString());
    }

    log("processed blocks:",
      Object.keys(miner_block_count).length,
      "unique miners");

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
    var piechart_labels = [];
    var piechart_dataset = {
      data: [],
      backgroundColor: [],
      label: 'miner-data'
    };
    var innerhtml_buffer = '<tr><th>Miner</th><th>Block Count</th>'
      + '<th>% of Total</th><th>Hashrate (Estimate)</th></tr>';
    sorted_miner_block_count.forEach(function(miner_info) {
      var addr = miner_info[0];
      var blocks = miner_info[1];
      var miner_name_link = getMinerNameLinkHTML(addr, known_miners);
      var percent_of_total_blocks = blocks/total_block_count;

      piechart_dataset.data.push(blocks);
      piechart_dataset.backgroundColor.push(getMinerColor(addr, known_miners))
      piechart_labels.push(getMinerName(addr, known_miners))

      innerhtml_buffer += '<tr><td>'
        + miner_name_link + '</td><td>'
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

    showBlockDistributionPieChart(piechart_dataset, piechart_labels);

    var blocks_since_last_reward = current_eth_block - last_reward_eth_block;
    var date_now = new Date();
    var date_of_last_mint = new Date(date_now.getTime() - blocks_since_last_reward*_SECONDS_PER_ETH_BLOCK*1000)

    function get_date_from_eth_block(eth_block) {
      /* TODO: use web3 instead, its probably more accurate */
      /* blockDate = new Date(web3.eth.getBlock(startBlock-i+1).timestamp*1000); */
      return new Date(date_of_last_mint.getTime() - ((last_reward_eth_block - eth_block)*_SECONDS_PER_ETH_BLOCK*1000)).toLocaleString()
    }

    /* fill in block info */
    var dt = new Date();
    var innerhtml_buffer = '<tr><th>Time (Approx)</th><th>Eth Block #</th>'
      + '<th>Transaction Hash</th><th>Miner</th></tr>';
    mined_blocks.forEach(function(block_info) {
      var eth_block = parseInt(block_info[0]);
      var tx_hash = block_info[1];
      var addr = block_info[2];

      var miner_name_link = getMinerNameLinkHTML(addr, known_miners);

      var transaction_url = _BLOCK_EXPLORER_TX_URL + tx_hash;
      var block_url = _BLOCK_EXPLORER_BLOCK_URL + eth_block;

      //log('hexcolor:', hexcolor, address_url);

      innerhtml_buffer  += '<tr><td>'
        + get_date_from_eth_block(eth_block) + '</td><td>'
        + '<a href="' + block_url + '">' + eth_block + '</td><td>'
        + '<a href="' + transaction_url + '" title="' + tx_hash + '">'
        + tx_hash.substr(0, 16) + '...</a></td><td align="right" style="text-overflow:ellipsis;white-space: nowrap;overflow: hidden;">'
        + miner_name_link + '</td></tr>';
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

/* get last hours_into_past worth of mined 0xbtc blocks, save to a CSV file */
function getMinerInfoCSV(eth, stats, hours_into_past){
  log('getMinerInfoCSV...')
  var last_reward_eth_block = getValueFromStats('Last Eth Reward Block', stats)
  var current_eth_block = getValueFromStats('Last Eth Block', stats)
  var last_difficulty_start_block = getValueFromStats('Last Difficulty Start Block', stats)

  if (hours_into_past == undefined) {
    hours_into_past = 48;
  }

  var num_eth_blocks_to_search = hours_into_past * 60 * 60 / 15;
  //var num_eth_blocks_to_search = last_reward_eth_block - last_difficulty_start_block;
  log("searching last", num_eth_blocks_to_search, "blocks");

  /* get all mint() transactions in the last N blocks */
  /* more info: https://github.com/ethjs/ethjs/blob/master/docs/user-guide.md#ethgetlogs */
  /* and https://ethereum.stackexchange.com/questions/12950/what-are-event-topics/12951#12951 */
  eth.getLogs({
    fromBlock: last_reward_eth_block - num_eth_blocks_to_search,
    toBlock: last_reward_eth_block,
    address: _CONTRACT_ADDRESS,
    topics: [_MINT_TOPIC, null],
  })
  .then((result) => {
    /* array of arrays of type [eth_block, txhash, miner_addr] */
    var mined_blocks = [];

    log("got filter results:", result.length, "transactions");

    result.forEach(function(transaction){
      var tx_hash = transaction['transactionHash'];
      var block_number = parseInt(transaction['blockNumber'].toString());
      var miner_address = getMinerAddressFromTopic(transaction['topics'][1].toString());

      mined_blocks.push([block_number, tx_hash, miner_address])
    });


    /* we will eventually show newest blocks first, so reverse the list */
    mined_blocks.reverse();

    var blocks_since_last_reward = current_eth_block - last_reward_eth_block;
    var date_now = new Date();
    var date_of_last_mint = new Date(date_now.getTime() - blocks_since_last_reward*_SECONDS_PER_ETH_BLOCK*1000)

    function get_date_from_eth_block(eth_block) {
      /* TODO: use web3 instead, its probably more accurate */
      /* blockDate = new Date(web3.eth.getBlock(startBlock-i+1).timestamp*1000); */
      return new Date(date_of_last_mint.getTime() - ((last_reward_eth_block - eth_block)*_SECONDS_PER_ETH_BLOCK*1000)).toLocaleString()
    }

    /* fill in block info */
    var dt = new Date();
    var csv_text = 'Time (Approx), Eth Block #, '
      + 'Transaction Hash, Miner Name, Erh Address\n';
    mined_blocks.forEach(function(block_info) {
      var eth_block = parseInt(block_info[0]);
      var tx_hash = block_info[1];
      var addr = block_info[2];

      if(known_miners[addr] !== undefined) {
        var miner_name = known_miners[addr][0];
      } else {
        var miner_name = '';
      }

      csv_text  += ''
        + '"' + get_date_from_eth_block(eth_block) + '"' + ', '
        + eth_block + ', '
        + tx_hash + ', '
        + miner_name + ', '
        + addr + '\n';

    });
    //el('#blockstats').innerHTML = csv_text;
    log('done');

    // Start file download.
    downloadTextAsFile("0xbtc-blocks-" + date_now.toLocaleTimeString() + ".csv",
                       csv_text);

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

        el_safe('#' + stat_name.replace(/ /g,"")).innerHTML = "<b>" + result + "</b> " + stat_unit;

        /* once we have grabbed all stats, update the calculated ones */
        if(areAllBlockchainStatsLoaded(stats)) {
          updateStatsThatHaveDependencies(stats);
          /* hack: check if miner table exists - if it doesn't then skip loading blocks */
          if(el('#minerstats')) {
            setTimeout(()=>{updateAllMinerInfo(eth, stats, 24)}, 0);
          }
        }
      }
    }
    /* run promises that store stat values */
    if(stat_function !== null) {
      stat_function().then(set_value(stats, stat_name, stat_unit, stat_multiplier, (value) => {stat[4]=value}));
    }
  });

  /* hack: check if stat table exists - if it doesn't then skip api updates */
  if(el('#TokenHolders')) {
    updateThirdPartyAPIs();
  }
}

function loadAllStats() {
  updateStatsTable(stats);
}

function updateAndDisplayAllStats() {
  createStatsTable();
  loadAllStats();
}


