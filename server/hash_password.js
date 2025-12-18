const bcrypt = require('bcrypt');
const password = 'Kizito@2020';

// Using 10 salt rounds, as specified in your authController.ts
const saltRounds = 10; 

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  console.log('--- Copy this hash: ---');
  console.log(hash);
});