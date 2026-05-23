const http = require('http');

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, body: data });
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    try {
        console.log("Querying activities for contact 9...");
        const res1 = await makeRequest('http://localhost:8000/api/v1/activities?entity_type=contact&entity_id=9');
        console.log("Contact 9 activities response status:", res1.statusCode);
        console.log("Contact 9 activities body:", JSON.stringify(res1.body, null, 2));

        console.log("Querying activities for deal 11...");
        const res2 = await makeRequest('http://localhost:8000/api/v1/activities?entity_type=deal&entity_id=11');
        console.log("Deal 11 activities response status:", res2.statusCode);
        console.log("Deal 11 activities body:", JSON.stringify(res2.body, null, 2));
    } catch (e) {
        console.error("Error making requests:", e);
    }
}
main();
