require('dotenv').config();

const config = {
  bigmailer: {
    apiKey: process.env.BIGMAILER_API_KEY,
    brandId: '55e9e9e3-0564-41c1-ba79-faa7516c009d',
    lists: {
      allUsers: '71a953b3-ef1d-4d20-91ba-10e896fe18a5',
      insiders: 'b4f91dc9-c499-4d62-ad5d-ac14e55bec29'
    }
  },
  
  mongodb: {
    username: process.env.username,
    password: process.env.password,
    host: process.env.host
  },
  
  emailTypes: {
    'All-Monthly': {
      listId: '71a953b3-ef1d-4d20-91ba-10e896fe18a5',
      templateName: 'Monthly Newsletter',
      contentType: 'general'
    },
    'Insiders-Monthly': {
      listId: 'b4f91dc9-c499-4d62-ad5d-ac14e55bec29',
      templateName: 'Insider Monthly',
      contentType: 'insider'
    }
  }
};

module.exports = config;