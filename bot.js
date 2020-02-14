require('dotenv').config({path: `${__dirname}/.env`});
const axios = require('axios');
const qs = require('qs');
const verify = require('./verify');

// Watson Assistant 
const Assistant = require('ibm-watson/assistant/v2');

const assistant = new Assistant({
  url: 'https://gateway.watsonplatform.net/assistant/api',
  version: '2019-04-04',
  iam_apikey: process.env.WATSON_API_KEY
});

let session = '';

const getSession = async() => {
  const result = await assistant.createSession({assistant_id: process.env.WATSON_ASSISTANT_ID});
  return result.session_id;
};

// Post a message to Slack
const send = async(channel, text) => { 
  const args = {
    token: process.env.SLACK_BOT_TOKEN,
    channel: channel,
    text: text,
  };
  
  const result = await axios.post('https://slack.com/api/chat.postMessage', qs.stringify(args));
  
  try {
    console.log(result.data);
  } catch(e) {
    console.log(e);
  }
};

// Get a reply from Watson
const reply = async (channel, text) => {

  //session = session ? session : await getSession();
  session = await getSession();
  
  const params = {
    workspace_id: process.env.WATSON_WORKSPACE_ID,
    assistant_id: process.env.WATSON_ASSISTANT_ID,
    session_id: session,
    input: { text: text }
  };
  
  const result = await assistant.message(params);
  console.log(JSON.stringify(result, null, 2));
  
  // Respond to the message back in the same channel
  send(channel, result.output.generic[0].text);
};

exports.handler = async function handler(params) {
  const {challenge, event} = params;

  // // verify signature from Slack
  // const signature = params.__ow_headers['x-slack-signature'];
  // const timestamp = params.__ow_headers['x-slack-request-timestamp'];
  // const rawBody = qs.stringify(params.__ow_body, {format:'RFC1738'}); // Turn on Raw HTTP Handling in cloud function Action setup
  
  // // Verify the signing secret
  // if (!verify.isVerified(signature, timestamp, rawBody)) {
  //   return {statusCode: 401};
  // }

  // slack events api challenge request
  if (challenge) {
    return {'challenge': challenge};
  } else {
    console.log(event.text);
  }

  // ignore the message from this bot
  if (event.bot_id) {
    return {statusCode: 200};
  }

  if(event.type === 'message' && event.channel_type === 'im') {
    await reply(event.channel, event.text);
    return {statusCode: 200};
  }
}