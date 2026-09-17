import http from "http";

async function verifyMarketsPage() {
  console.log("Checking Next.js frontend page on http://localhost:3100/markets...");
  
  return new Promise((resolve, reject) => {
    http.get("http://localhost:3100/markets", (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        console.log(`HTTP Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          console.log("✅ Next.js /markets responded with HTTP 200 OK!");
          console.log(`Page payload size: ${data.length} bytes`);
          resolve(true);
        } else {
          console.error(`❌ HTTP Error: ${res.statusCode}`);
          resolve(false);
        }
      });
    }).on("error", (err) => {
      console.error(`❌ Network error connecting to localhost:3100: ${err.message}`);
      resolve(false);
    });
  });
}

verifyMarketsPage().then((ok) => {
  if (!ok) process.exit(1);
});
