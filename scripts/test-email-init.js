const fetch = require('node-fetch');

async function testInitTemplates() {
  try {
    console.log('Testing Initialize Templates API...');
    
    const response = await fetch('http://localhost:3000/api/admin/emails/init-templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'next-auth.session-token=your-session-token' // You'll need to replace this with a real session token
      }
    });

    const data = await response.json();
    console.log('Response:', data);
    
    if (data.success) {
      console.log('✅ Initialize Templates API is working!');
    } else {
      console.log('❌ Initialize Templates API failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Error testing Initialize Templates API:', error.message);
  }
}

testInitTemplates();
