
const BASE_URL = 'http://localhost:8787';
const TOKEN = 'super_admin_token';

async function verify() {
  console.log('🏁 Starting programmatic verification of Super Admin endpoints...');
  
  const endpoints = [
    { name: 'Super Admin Dashboard Analytics', path: '/api/v2/dashboard/super-admin' },
    { name: 'Platform Security Metrics', path: '/api/v2/system/security' },
    { name: 'Platform Performance Metrics', path: '/api/v2/system/performance' },
    { name: 'Global Audit Logs Search', path: '/api/v2/audit-logs?limit=5' },
    { name: 'Global Audit Actions Catalog', path: '/api/v2/audit-logs/actions' }
  ];

  for (const ep of endpoints) {
    try {
      console.log(`\n📡 Querying endpoint: ${ep.name} (${ep.path})...`);
      const res = await fetch(`${BASE_URL}${ep.path}`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      const status = res.status;
      const data = await res.json();
      
      if (status === 200) {
        console.log(`✅ Success (200 OK)!`);
        console.log(`   Sample payload keys:`, Object.keys(data));
        if (ep.path.includes('performance')) {
          console.log(`   Uptime: ${data.uptimeSeconds}s | Avg Response: ${data.averageResponseTimeMs}ms`);
        } else if (ep.path.includes('security')) {
          console.log(`   Security Events Count:`, JSON.stringify(data));
        } else if (ep.path.includes('dashboard')) {
          console.log(`   Summary counts:`, JSON.stringify(data.summary));
        }
      } else {
        console.error(`❌ Failed with status ${status}:`, data);
      }
    } catch (err) {
      console.error(`❌ Request encountered error:`, err.message);
    }
  }

  console.log('\n🏁 Programmatic verification completed.');
}

verify();
