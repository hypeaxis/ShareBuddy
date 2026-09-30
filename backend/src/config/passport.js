/**
 * Passport.js Configuration for OAuth Authentication
 * Handles Google OAuth 2.0 and Facebook Login strategies
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const { query } = require('./database');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const result = await query(
      'SELECT user_id, email, username, full_name, role, credits FROM users WHERE user_id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return done(null, false);
    }
    
    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: config.GOOGLE_CLIENT_ID,
  clientSecret: config.GOOGLE_CLIENT_SECRET,
  callbackURL: config.GOOGLE_CALLBACK_URL,
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔵 Google OAuth Strategy - Processing user profile');
    
    const email = profile.emails[0].value;
    const googleId = profile.id;
    const fullName = profile.displayName;
    const avatar = profile.photos[0]?.value;

    console.log('📧 Email:', email);
    console.log('🆔 Google ID:', googleId);
    console.log('👤 Name:', fullName);

    // Check if user exists with this Google ID
    console.log('🔍 Checking if user exists with Google ID...');
    let result = await query(
      'SELECT * FROM users WHERE google_id = $1',
      [googleId]
    );

    if (result.rows.length > 0) {
      // User exists with Google ID - login
      const user = result.rows[0];
      console.log('✅ Found existing user with Google ID:', user.user_id);
      
      // Update OAuth token if needed
      await query(
        `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, provider) 
         DO UPDATE SET access_token = $3, refresh_token = $4, updated_at = NOW()`,
        [user.user_id, 'google', accessToken, refreshToken]
      );
      
      console.log('✅ OAuth token updated for user:', user.user_id);
      return done(null, user);
    }

    // Check if user exists with this email
    console.log('🔍 Checking if user exists with email...');
    result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length > 0) {
      // User exists with email - link Google account
      const user = result.rows[0];
      console.log('✅ Found existing user with email, linking Google ID:', user.user_id);
      
      await query(
        'UPDATE users SET google_id = $1 WHERE user_id = $2',
        [googleId, user.user_id]
      );
      
      // Store OAuth token
      await query(
        `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, provider) 
         DO UPDATE SET access_token = $3, refresh_token = $4, updated_at = NOW()`,
        [user.user_id, 'google', accessToken, refreshToken]
      );
      
      console.log('✅ Google account linked to existing user:', user.user_id);
      return done(null, user);
    }

    // Create new user
    console.log('👤 Creating new user...');
    const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(7);
    
    result = await query(
      `INSERT INTO users (email, username, full_name, google_id, avatar_url, email_verified, credits)
       VALUES ($1, $2, $3, $4, $5, TRUE, 10)
       RETURNING *`,
      [email, username, fullName, googleId, avatar]
    );

    const newUser = result.rows[0];
    console.log('✅ New user created:', newUser.user_id);

    // Create welcome credit transaction
    await query(
      `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
       VALUES ($1, $2, $3, $4)`,
      [newUser.user_id, 10, 'bonus', 'Chào mừng thành viên mới - Bonus 10 credits']
    );
    console.log('✅ Welcome bonus credit added');

    // Store OAuth token
    await query(
      `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token)
       VALUES ($1, $2, $3, $4)`,
      [newUser.user_id, 'google', accessToken, refreshToken]
    );
    console.log('✅ OAuth token stored');

    console.log('✅ Google OAuth Strategy - User ready:', newUser.user_id);
    return done(null, newUser);
  } catch (error) {
    console.error('❌ Google OAuth error:', error);
    console.error('Error stack:', error.stack);
    return done(error, null);
  }
}));

// Facebook OAuth Strategy
passport.use(new FacebookStrategy({
  clientID: config.FACEBOOK_APP_ID,
  clientSecret: config.FACEBOOK_APP_SECRET,
  callbackURL: config.FACEBOOK_CALLBACK_URL,
  profileFields: ['id', 'displayName', 'photos', 'email'],
  scope: ['email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    const facebookId = profile.id;
    const fullName = profile.displayName;
    const avatar = profile.photos?.[0]?.value;

    if (!email) {
      return done(new Error('No email provided by Facebook'), null);
    }

    // Check if user exists with this Facebook ID
    let result = await query(
      'SELECT * FROM users WHERE facebook_id = $1',
      [facebookId]
    );

    if (result.rows.length > 0) {
      // User exists with Facebook ID - login
      const user = result.rows[0];
      
      // Update OAuth token
      await query(
        `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, provider) 
         DO UPDATE SET access_token = $3, refresh_token = $4, updated_at = NOW()`,
        [user.user_id, 'facebook', accessToken, refreshToken]
      );
      
      return done(null, user);
    }

    // Check if user exists with this email
    result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length > 0) {
      // User exists with email - link Facebook account
      const user = result.rows[0];
      
      await query(
        'UPDATE users SET facebook_id = $1 WHERE user_id = $2',
        [facebookId, user.user_id]
      );
      
      // Store OAuth token
      await query(
        `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, provider) 
         DO UPDATE SET access_token = $3, refresh_token = $4, updated_at = NOW()`,
        [user.user_id, 'facebook', accessToken, refreshToken]
      );
      
      return done(null, user);
    }

    // Create new user
    const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(7);
    
    result = await query(
      `INSERT INTO users (email, username, full_name, facebook_id, avatar_url, email_verified, credits)
       VALUES ($1, $2, $3, $4, $5, TRUE, 10)
       RETURNING *`,
      [email, username, fullName, facebookId, avatar]
    );

    const newUser = result.rows[0];

    // Create welcome credit transaction
    await query(
      `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
       VALUES ($1, $2, $3, $4)`,
      [newUser.user_id, 10, 'bonus', 'Chào mừng thành viên mới - Bonus 10 credits']
    );

    // Store OAuth token
    await query(
      `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token)
       VALUES ($1, $2, $3, $4)`,
      [newUser.user_id, 'facebook', accessToken, refreshToken]
    );

    return done(null, newUser);
  } catch (error) {
    console.error('Facebook OAuth error:', error);
    return done(error, null);
  }
}));

module.exports = passport;
