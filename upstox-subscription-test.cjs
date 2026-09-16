const { randomUUID } = require("node:crypto");

const subscription = {
  guid: randomUUID(),
  method: "sub",
  data: {
    mode: "ltpc",
    instrumentKeys: [
      "NSE_INDEX|Nifty 50",
      "NSE_INDEX|Nifty Bank",
      "NSE_INDEX|India VIX"
    ]
  }
};

console.log(JSON.stringify(subscription, null, 2));
10
↓
50
↓
200
↓
500
↓
1,000
↓
2,000
↓
5,000 LTPC
CPU
memory
ticks/sec
decode latency
gateway latency
UI update latency
dropped messages
reconnects
const { randomUUID } = require("node:crypto");

const subscription = {
  guid: randomUUID(),
  method: "sub",
  data: {
    mode: "ltpc",
    instrumentKeys: [
      "NSE_INDEX|Nifty 50",
      "NSE_INDEX|Nifty Bank",
      "NSE_INDEX|India VIX"
    ]
  }
};

console.log(JSON.stringify(subscription, null, 2));