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