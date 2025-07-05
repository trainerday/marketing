const https = require('https');
require('dotenv').config();

const apiKey = process.env.BIGMAILER_API_KEY;

// Make API request
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            data: data ? JSON.parse(data) : null
          };
          resolve(response);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Get all brands
async function getBrands() {
  console.log('Fetching brands...\n');
  
  const options = {
    hostname: 'api.bigmailer.io',
    port: 443,
    path: '/v1/brands',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-API-Key': apiKey
    }
  };

  const response = await makeRequest(options);
  return response.data;
}

// Get lists for a brand
async function getLists(brandId) {
  console.log(`\nFetching lists for brand ${brandId}...\n`);
  
  const options = {
    hostname: 'api.bigmailer.io',
    port: 443,
    path: `/v1/brands/${brandId}/lists`,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-API-Key': apiKey
    }
  };

  const response = await makeRequest(options);
  return response.data;
}

// Create a new list
async function createList(brandId, listName) {
  console.log(`\nCreating list "${listName}"...\n`);
  
  const postData = JSON.stringify({
    name: listName
  });

  const options = {
    hostname: 'api.bigmailer.io',
    port: 443,
    path: `/v1/brands/${brandId}/lists`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': apiKey,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const response = await makeRequest(options, postData);
  return response;
}

// Add contact to list using upsert endpoint
async function addContactToList(brandId, listId, email, name) {
  console.log(`\nAdding ${email} to list...\n`);
  
  const postData = JSON.stringify({
    email: email,
    name: name,
    list_ids: [listId]
  });

  const options = {
    hostname: 'api.bigmailer.io',
    port: 443,
    path: `/v1/brands/${brandId}/contacts/upsert`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': apiKey,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const response = await makeRequest(options, postData);
  return response;
}

// Main function
async function main() {
  try {
    // 1. Get brands
    const brandsResponse = await getBrands();
    console.log('Brands found:', brandsResponse);
    
    // Extract brands array from response
    const brands = brandsResponse.data || [];
    
    // Find TrainerDay brand
    const trainerDayBrand = brands.find(brand => 
      brand.name === 'TrainerDay' || 
      brand.name.toLowerCase() === 'trainerday'
    );
    
    if (!trainerDayBrand) {
      console.error('TrainerDay brand not found!');
      console.log('Available brands:', brands.map(b => b.name).join(', '));
      return;
    }
    
    console.log(`\nFound TrainerDay brand with ID: ${trainerDayBrand.id}`);
    
    // 2. Get existing lists
    const listsResponse = await getLists(trainerDayBrand.id);
    const lists = listsResponse.data || [];
    console.log('Existing lists:', lists.map(l => ({ id: l.id, name: l.name })));
    
    // 3. Create "Testing" list
    const createResponse = await createList(trainerDayBrand.id, 'Testing');
    
    if (createResponse.statusCode === 201 || createResponse.statusCode === 200) {
      console.log('✅ List created successfully!');
      console.log('List details:', createResponse.data);
      
      const listId = createResponse.data.id;
      
      // 4. Add contact to the list
      const contactResponse = await addContactToList(
        trainerDayBrand.id,
        listId,
        'av@totxt.net',
        'alex'
      );
      
      if (contactResponse.statusCode === 201 || contactResponse.statusCode === 200) {
        console.log('✅ Contact added successfully!');
        console.log('Contact details:', contactResponse.data);
      } else {
        console.log('❌ Failed to add contact');
        console.log('Response:', contactResponse);
      }
      
    } else {
      console.log('❌ Failed to create list');
      console.log('Response:', createResponse);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the script
main();