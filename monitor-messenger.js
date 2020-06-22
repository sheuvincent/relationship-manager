
/*
Requires facebook chat api. To install, run >npm install facebook-chat-api
Project: github.com/Schmavery/facebook-chat-api
*/

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const opn = require('open');
const destroyer = require('server-destroy');

const {google} = require('googleapis');
const sheets = google.sheets('v4');

const readline = require('readline');
const login = require("facebook-chat-api");

// If modifying these scopes, delete token.json.
const SCOPES = [
  // Gmail
  // 'https://mail.google.com/', 

  // Calendar
  // 'https://www.google.com/calendar/feeds', 

  // Contacts
  // 'https://www.googleapis.com/auth/contacts',
  
  // Contacts (read only)
  // 'https://www.googleapis.com/auth/contacts.readonly',

  // Spreadsheets
  'https://www.googleapis.com/auth/spreadsheets'
];  

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const OAUTH2_APP_KEY_PATH = 'relationship-manager_google_app_oauth2_client_secret.json' // Don't change this

const OAUTH2_USER_TOKEN_PATH = 'relationship-manager_oauth2_user_token.json';

const MESSENGER_APP_STATE_PATH = 'messenger_login_app_state.json'



/*********************
 * TODO: OAuth2 for Google *
 *********************/

/**
 * To use OAuth2 authentication, we need access to a a CLIENT_ID, CLIENT_SECRET, 
 * AND REDIRECT_URI.  To get these credentials for your application, visit
 * https://console.cloud.google.com/apis/credentials.
 */
// const keyPath = path.join(__dirname, 'oauth2.keys.json');
/*
const keyPath = path.join(__dirname, OAUTH2_KEY_PATH)
let keys = {redirect_uris: ['']};
if (fs.existsSync(keyPath)) {
  keys = require(keyPath).web;
}
*/

/**
 * Create a new OAuth2 client with the configured keys.
 */
 /*
const oauth2Client = new google.auth.OAuth2(
  keys.client_id,
  keys.client_secret,
  keys.redirect_uris[0]
);
*/

/**
 * This is one of the many ways you can configure googleapis to use 
 * authentication credentials.  In this method, we're setting a global reference 
 * for all APIs.  Any other API you use here, like google.drive('v3'), will now 
 * use this auth client. You can also override the auth client at the service 
 * and method call levels.
 */
 /*
google.options({auth: oauth2Client});
*/


/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(key_path, scopes, callback) {
  // To use OAuth2 authentication, we need access to a a CLIENT_ID, CLIENT_SECRET, 
  // and REDIRECT_URI.  To get these credentials for your application, visit
  // https://console.cloud.google.com/apis/credentials.
  // const keyPath = path.join(__dirname, 'oauth2.keys.json');
  const full_key_path = path.join(__dirname, key_path)
  let keys = {redirect_uris: ['']};
  if (fs.existsSync(full_key_path)) {
    keys = require(full_key_path).web;
  }


  /*
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
     client_id, client_secret, redirect_uris[0]);
  */

  // Create a new OAuth2 client with the configured keys.
  const oauth2Client = new google.auth.OAuth2(
    keys.client_id,
    keys.client_secret,
    keys.redirect_uris[0]
  );

  // This is one of the many ways you can configure googleapis to use 
  // authentication credentials.  In this method, we're setting a global reference 
  // for all APIs.  Any other API you use here, like google.drive('v3'), will now 
  // use this auth client. You can also override the auth client at the service 
  // and method call levels.
  google.options({auth: oauth2Client});
  
  // Check if we have previously stored a token; otherwise get new token.
  fs.readFile(OAUTH2_USER_TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oauth2Client, scopes, callback);
    oauth2Client.setCredentials(JSON.parse(token));
    callback(oauth2Client);
  });
}



/**
 * Open an http server to accept the oauth callback. In this simple example,
 * the only request to our webserver is to /callback?code=<code>
 */
async function getNewToken(oauth2Client, scopes, callback) {
  return new Promise((resolve, reject) => {
    // grab the url that will be used for authorization
    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes.join(' '),
    });

    const server = http
      .createServer(async (req, res) => {
        try {
          if (req.url.indexOf('/oauth2callback') > -1) {
            const qs = new url.URL(req.url, 'http://localhost:3000')
              .searchParams;
            res.end('Authentication successful! Please return to the console.');
            server.destroy();
            const {tokens} = await oauth2Client.getToken(qs.get('code'));
            oauth2Client.credentials = tokens; // eslint-disable-line require-atomic-updates
           
          // Store the token to disk for later program executions
          fs.writeFile(OAUTH2_USER_TOKEN_PATH, JSON.stringify(tokens), (err) => {
            if (err) return console.error(err);
            console.log('Token stored to', OAUTH2_USER_TOKEN_PATH);
          });

            resolve(oauth2Client);
          }
        } catch (e) {
          reject(e);
        }
      })
      .listen(3000, () => {
        // open the browser to the authorize url to start the workflow
        opn(authorizeUrl, {wait: false}).then(cp => cp.unref());
      });
    destroyer(server);
  });
}
/*
async function runSample() {
  // retrieve user profile
  const res = await plus.people.get({userId: 'me'});
  console.log(res.data);
}
*/


// authenticate(SCOPES)
//  .then(client => runSample(client))
//  .catch(console.error);
authorize(OAUTH2_APP_KEY_PATH, SCOPES, messenger_listener)







/*****************************************
 * Facebook Messenger Listening/Handling *
 *****************************************/

// 1. LOGIN TO FACEBOOK MESSENGER (complete)
/*
// 1a. Login and save to appstate.json (only for new instances)
login({email: "FB_EMAIL", password: "FB_PASSWORD"}, (err, api) => {
    if(err) return console.error(err);
    fs.writeFileSync('appstate.json', JSON.stringify(api.getAppState()));
*/

// 1b. Login using existing appstate.json
function messenger_listener(auth) {
  const sheets = google.sheets({version: 'v4', auth});
  login({appState: JSON.parse(fs.readFileSync(MESSENGER_APP_STATE_PATH, 'utf8'))}, (err, api) => {

    // 2. OPTIONS
    // OPTION: Enable to listen to events (joining/leaving a chat, title change etc…)
    // api.setOptions({listenEvents: true});
  
    // OPTION: Listen to messages from user as well
    api.setOptions({selfListen: true})

    // 3. LISTEN
    api.listenMqtt((err, event) => {
      if(err) return console.error(err);

      // 4. HANDLE MESSAGES
      switch(event.type) {
        // If message,
        case "message":
          /*
          if(event.body === '/stop') {
            api.sendMessage("Goodbye…", event.threadID);
            return stopListening();
          }
          api.sendMessage("TEST BOT: " + event.body, event.threadID);
            break;
          */

        
          if (event.isGroup) { 
            // Handle Groups

            if (event.senderID == api.getCurrentUserID()) {
              // Handle DM from self

            } else {
              // Handle DM from other party

            }

          } else { 
            // Handle DMs

            if (event.senderID == api.getCurrentUserID()) {
              // Handle DM from self

              // TODO: Check if contact is being tracked.
              // TODO: If so, Update spreadsheet with a message out from user to contact

              console.log(event);
            } else {
              // Handle DM from other party
            
              // TODO: Check if contact is being tracked.
              // TODO: If so, Update spreadsheet with a message out from contact to user
              console.log(event);
              console.log(event);
            }
          }

          break;
          
        // Else if event, no need to do anything
        case "event":
          console.log(event);
          break;
      }         
    });
  });
}





