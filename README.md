# 0xBTC
Simple web site to show stats about the 0xBTC ERC-20 token ([link](https://0x1d00ffff.github.io/0xBTC-Stats/))

#### BUGS

 - When loading graphs, occasionally the last epoch value loaded is 0, which
   causes hashrate to be a very large negative number. 

    4.77s  block # 5404660 ts  value[1]: 37579
    4.77s  block # 5410420 ts  value[1]: 0
    ...
    for block 5404660 diff 20212668 uhr 141296790405.12 hr 387094332047.3599
    for block 5410420 diff 20212668 uhr 141296790405.12 hr -55310334235770.875

#### TODO

 - use lastDifficultyPeriodStarted to find/iterate over difficulty changes 
 - modify hexcolor algo to pick a random hue, leaving saturation/value constant
 - add selectors to change graph window size and resolution
 - scale y-axes in hashrate/difficulty graph such that the values on corresponding
   axes match up. This way difficulty will visibly approach hashrate line on graph
 - move more of the static html (table header rows etc) from js into .html files
 - ~~colorize the miner names in the 'block distribution' table~~
 - add human-readable dates next to the eth block numbers in stats
 - add a set of useful links to the footer of the site
 - ~~improve hashrate graph accuracy: currently, we load a set of time 'windows' 
   and calcualte hashrate for each window, using the difficulty value set at the
   *end* of the window. A better technique: if window is over blocks 1-300 and
   diffuculty changes at block 100, 1/3 are at low diff and 2/3 at high diff.~~~
   Verify that this is fixed
 - graphs to add:
   - ~~pie chart to 'block distribution' section~~
   - total hashes over time
   - token holders over time
   - token transfers / day
   - contract transactions / day
   - stacked line graph showing different miners hashrates over time
   - gas spent on mint()s over time

#### Misc notes

### 0xBitcoin contract storage locations

    index: val name
    0: owner
    1: ? (value 0) rewardEra int?
    2: symbol str
    3: name str
    4: decimals int (uint8)
    5: \_totalSupply int
    6: ? (value 5262750) lastDifficultyPeriodStarted int?
    7: ? (value 31329) rewardEra int?
    8: BLOCKS_PER_READJUSTMENT int
    9: MINIMUM_TARGET int
    10: MAXIMUM_TARGET int
    11: ? 0000000000076411c2fa836decd054fc03e823c6442d14ae4359f307fe2c796d
          3040438271328086423202685576059233445100215085063115811523950957 mining target int?
    12: ? 05b6e2fd7b4e62c910f34eb4c15d47d71b73c07825a65cf61dfb2bef296cb719
          2584697037232537302520316009029087065338665641947036110179329260226006005529
    13: ? (value 0)
    14: maxSupplyForEra int
    15: lastRewardTo int
    16: lastRewardAmount int
    17: ? (value 5279988) lastRewardEthBlockNumber int?
    18: ? (value 1)
    19: ? (value 0)
    20: ? (value 156640000000000) tokensMinted int?
    21: ? (value 0)
    22: ? (value 0)

how to figure out what values are located where:

    # figure out what indexes contract variables lie (prints first 15 indexes)
    function hex2a(hexx) {
        var hex = hexx.toString();//force conversion
        var str = '';
        for (var i = 0; i < hex.length; i += 2)
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        return str;
    }
    for (var i=0; i<15; i++){
        var hex_str = (await eth.getStorageAt('0xB6eD7644C69416d67B522e20bC294A9a9B405B31', i, 5280486)).toString();
        hex_str = hex_str.substr(2, 64);
        
        console.log(i, hex_str);
        console.log('    u256(int):', new Eth.BN(hex_str, 16).toString(10));
        console.log('    u128[0](int):', new Eth.BN(hex_str.substr(0,32), 16).toString(10));
        console.log('    u128[1](int):', new Eth.BN(hex_str.substr(32,64), 16).toString(10));
        try { 
            console.log('    u256(str):', hex2a(hex_str));
            } catch(err) {
                console.log('    u256(str): bad');
            }
        try { 
            console.log('    u128[0](str):', hex2a(hex_str.substr(0,32)));
            } catch(err) {
                console.log('    u128[0](str): bad');
            }
        try { 
            console.log('    u128[1](str):', hex2a(hex_str.substr(32,64)));
            } catch(err) {
                console.log('    u128[1](str): bad');
            }
    }
