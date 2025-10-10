/**
 * Clear all users from Elasticsearch
 */

import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: process.env.ES_HOST || 'http://localhost:9200',
  auth: { 
    username: process.env.ES_USERNAME || 'elastic', 
    password: process.env.ES_PASSWORD || 'changeme' 
  },
});

const USERS_INDEX = 'memora-users';
const PASSCODES_INDEX = 'memora-passcodes';

async function clearUsers() {
  try {
    console.log('🗑️  Clearing all users...');

    // Delete all documents from users index
    const usersExists = await client.indices.exists({ index: USERS_INDEX });
    if (usersExists) {
      await client.deleteByQuery({
        index: USERS_INDEX,
        body: {
          query: {
            match_all: {}
          }
        },
        refresh: true,
      });
      console.log('✅ Deleted all users');
    } else {
      console.log('ℹ️  Users index does not exist');
    }

    // Delete all passcodes
    const passcodesExists = await client.indices.exists({ index: PASSCODES_INDEX });
    if (passcodesExists) {
      await client.deleteByQuery({
        index: PASSCODES_INDEX,
        body: {
          query: {
            match_all: {}
          }
        },
        refresh: true,
      });
      console.log('✅ Deleted all passcodes');
    } else {
      console.log('ℹ️  Passcodes index does not exist');
    }

    console.log('✨ All users and passcodes cleared!');
  } catch (error) {
    console.error('❌ Error clearing users:', error);
    process.exit(1);
  }
}

clearUsers();
