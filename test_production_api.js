const https = require('https');
const jwt = require('jsonwebtoken');

const token = jwt.sign(
    { userId: 2, companyId: 1, role: 'ADMIN' },
    'worksuite_crm_jwt_secret_key_2025_change_in_production',
    { expiresIn: '24h' }
);

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, body: data });
                }
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

async function main() {
    try {
        console.log("Querying production activities for contact 9...");
        const res1 = await makeRequest('https://innopark-production.up.railway.app/api/v1/activities?entity_type=contact&entity_id=9');
        console.log("Contact 9 response status:", res1.statusCode);
        if (res1.body && res1.body.data) {
            console.log(`Contact 9 activities count: ${res1.body.data.length}`);
            res1.body.data.forEach(act => {
                console.log(` - ID: ${act.id}, Type: ${act.type}, EntityType: ${act.entity_type}, EntityID: ${act.entity_id}, contact_id: ${act.contact_id}, deal_id: ${act.deal_id}`);
            });
        } else {
            console.log("Contact 9 body:", JSON.stringify(res1.body, null, 2));
        }

        console.log("\nQuerying production activities for deal 11...");
        const res2 = await makeRequest('https://innopark-production.up.railway.app/api/v1/activities?entity_type=deal&entity_id=11');
        console.log("Deal 11 response status:", res2.statusCode);
        if (res2.body && res2.body.data) {
            console.log(`Deal 11 activities count: ${res2.body.data.length}`);
            res2.body.data.forEach(act => {
                console.log(` - ID: ${act.id}, Type: ${act.type}, EntityType: ${act.entity_type}, EntityID: ${act.entity_id}, contact_id: ${act.contact_id}, deal_id: ${act.deal_id}`);
            });
        } else {
            console.log("Deal 11 body:", JSON.stringify(res2.body, null, 2));
        }
    } catch (e) {
        console.error("Error making requests:", e);
    }
}
main();
