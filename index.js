'use strict';
let date = require('date-and-time');
const Alexa = require('alexa-sdk');
const AWS = require('aws-sdk');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const fs = require('fs');
const AWSregion = 'us-east-1';
const def="yes";

AWS.config.update({
    region: AWSregion
});

const clientSecretsFile = 'client_secret.json';
const APP_ID = "";
const SKILL_NAME = 'Revise Smart';
const HELP_MESSAGE = `  The following commands are available<break time="1s"/> I studied <break time="500ms"/>topicname <break time="500ms"/>and <break time="500ms"/>subjectname to schedule a revision reminder<break time="1s"/>
                        Show me all the revisions set for today <break time="1s"/>Customize my revision time <break time="1s"/>or you could reset your customization by saying <break time="1s"/>Reset my preferences<break time="1s"/>
                        or, you can say exit<break time="1s"/> What can I help you with?`;
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';
const INSTRUCTIONS =    `Welcome to Revise Smart<break time="1s"/>
                        The following commands are available<break time="1s"/> I studied <break time="500ms"/>topicname <break time="500ms"/>and <break time="500ms"/>subjectname to schedule a revision reminder<break time="1s"/>
                        Show me all the revisions set for today <break time="1s"/>Customize my revision time <break time="1s"/>or you could reset your customization by saying <break time="1s"/>Reset my preferences<break time="1s"/>
                        What would you like me to do `;
const cINSTRUCTIONS =`Welcome to Revise Smart
                      The following commands are available : 
                      1."I studied topicname and subjectname " to schedule a revision reminder
                      2.Show me all the revisions set for today 
                      3.Customize my revision time
                      4.Reset your customization by saying "Reset my preferences"
                      What would you like me to do ?`;
let freq=new Array(4);
freq[0]=1;
freq[1]=7;
freq[2]=15;
freq[3]=30;

let weekday = new Array(7);
weekday[0] =  "Sunday";
weekday[1] = "Monday";
weekday[2] = "Tuesday";
weekday[3] = "Wednesday";
weekday[4] = "Thursday";
weekday[5] = "Friday";
weekday[6] = "Saturday";
let month = new Array();
month[0] = "January";
month[1] = "February";
month[2] = "March";
month[3] = "April";
month[4] = "May";
month[5] = "June";
month[6] = "July";
month[7] = "August";
month[8] = "September";
month[9] = "October";
month[10] = "November";
month[11] = "December";


const handlers = {
    'LaunchRequest': function () {
        let speechout=INSTRUCTIONS;
        authorise(global.token,noevent,this,speechout,true,speechout);
     
    },
   'Unhandled': function () {
        
        var speechOutput = "Sorry, can you try again please";
        this.emit(':responseReady', speechOutput);
    },
    'studiedIntent': function(){
        let dialogState = this.event.request.dialogState;
        let confirmState=this.event.request.intent.confirmationStatus;
        if (dialogState === "STARTED" || dialogState !== "COMPLETED") {
            
            this.emit(":delegate",this.event.request.intent);
          }
          
         else if(confirmState!=="CONFIRMED")
         {
             this.response.speak("okay the request has been cancelled "+HELP_MESSAGE).listen(HELP_REPROMPT);
    this.emit(':responseReady');
         }
  else{
  let sv=this;
        
        let timestamp="";
        
        
        let topicname = this.event.request.intent.slots.TopicName.value;
        let subjectname = this.event.request.intent.slots.SubjectName.value;
        let eventtime =this.event.request.intent.slots.EventsTime.value;
        let eventdate = isSlotValid(this.event.request, "EventDate");
        if(!eventdate){
            timestamp=new Date(this.event.request.timestamp);
            timestamp.setHours(Number(eventtime.substr(0,eventtime.indexOf(":"))));
            timestamp.setMinutes(Number(eventtime.substr(-2)));
            if(timestamp=="Invalid Date")
            timestamp=new Date(this.event.request.timestamp);
            console.log("timestamp:: "+timestamp);
        }
        else{
            timestamp=new Date(eventdate);
           timestamp.setUTCHours(Number(eventtime.substr(0,eventtime.indexOf(":"))));
            timestamp.setUTCMinutes(Number(eventtime.substr(-2)));
             if(timestamp=="Invalid Date")
             timestamp=new Date(eventdate);
             if(timestamp=="Invalid Date")
             timestamp=new Date(this.event.request.timestamp);
            console.log("timestamp:: "+timestamp);
        }
        date.format(timestamp, 'dddd MMM DD YYYY');
    
      if(this.attributes['setdefault']==def)
        {
            timestamp.setUTCHours(this.attributes['defaulttime'].substr(0,2));
            timestamp.setUTCMinutes(this.attributes['defaulttime'].substr(3,5));
            console.log("timestamp def:: "+timestamp);
            if(this.attributes['freq1']!=undefined)
            freq[0]=this.attributes['freq1'];
            if(this.attributes['freq1']!=undefined)
            freq[1]=this.attributes['freq2'];
            if(this.attributes['freq1']!=undefined)
            freq[2]=this.attributes['freq3'];
            if(this.attributes['freq1']!=undefined)
            freq[3]=this.attributes['freq4'];
           
        }
        else
        {
            freq[0]=1;
            freq[1]=7;
            freq[2]=15;
            freq[3]=30;
        }
      let doc=new AWS.DynamoDB.DocumentClient();
     
      let params= {
        TableName: "revisionList",
        Item: {
            "userId": global.userId,
            "revisionname":  subjectname.capitalize()+":"+topicname.capitalize(),
            "reminderdate": [ date.addDays(timestamp,freq[0]).toString(),date.addDays(timestamp,freq[1]).toString(),date.addDays(timestamp,freq[2]).toString(),date.addDays(timestamp,freq[3]).toString()]
        }};
      
        
      doc.put(params, function(err, data) {
       if (err) {
            let speechout= "I'm sorry there seems to be a problem";
        
        sv.response.cardRenderer(SKILL_NAME, speechout);
        sv.response.speak(speechout).listen(HELP_MESSAGE);
        sv.emit(':responseReady');
       } else {
            let speechout= "I have successfully added a revision reminder for topic "+topicname.capitalize()+" from "+subjectname.capitalize()+".\n Your upcoming reminder is set for "+weekday[date.addDays(timestamp,freq[0]).getDay()]+" "+date.addDays(timestamp,freq[0]).getDate()+"th "+month[date.addDays(timestamp,freq[0]).getMonth()]+". ";
    
var event=new Array(4);
 event[0] = {
  'summary': `Revision of ${topicname.capitalize()} from ${subjectname.capitalize()}`,
  
  'description': 'Revision reminder set by Revise Smart',
  'start': {
    'date': (date.addDays(timestamp,freq[0]).toISOString()).split("T")[0],
    
  },
  'end': {
    'date': ((date.addHours(date.addDays(timestamp,freq[0]),2)).toISOString()).split("T")[0],
    
  },
  'recurrence': [
    //
  ],
  
  'reminders': {
    'useDefault': true
  }
};
event[1] = {
  'summary': `Revision of ${topicname.capitalize()} from ${subjectname.capitalize()}`,
  
  'description': 'Revision reminder set by Revise Smart',
  'start': {
    'date': (date.addDays(timestamp,freq[1]).toISOString()).split("T")[0],
    
  },
  'end': {
    'date': ((date.addHours(date.addDays(timestamp,freq[1]),2)).toISOString()).split("T")[0],
    
  },
  'recurrence': [
    //
  ],
  
  'reminders': {
    'useDefault': true
  }
};
event[2] = {
  'summary': `Revision of ${topicname.capitalize()} from ${subjectname.capitalize()}`,
  
  'description': 'Revision reminder set by Revise Smart',
  'start': {
    'date': (date.addDays(timestamp,freq[2]).toISOString()).split("T")[0],
    
  },
  'end': {
    'date': ((date.addHours(date.addDays(timestamp,freq[2]),2)).toISOString()).split("T")[0],
    
  },
  'recurrence': [
    //
  ],
  
  'reminders': {
    'useDefault': true
  }
};
event[3] = {
  'summary': `Revision of ${topicname.capitalize()} from ${subjectname.capitalize()}`,
  
  'description': 'Revision reminder set by Revise Smart',
  'start': {
    'date': (date.addDays(timestamp,freq[3]).toISOString()).split("T")[0],
    
  },
  'end': {
    'date': ((date.addHours(date.addDays(timestamp,freq[3]),2)).toISOString()).split("T")[0],
    
  },
  'recurrence': [
    //
  ],
  
  'reminders': {
    'useDefault': true
  }
};

           authorise(sv.event.session.user.accessToken, insertEvent, sv,event,false,speechout);
       
       }
       
      });
      
        }}
    ,'customiseTimeIntent':function(){
        let sv=this;
    let dialogState = this.event.request.dialogState;
    let confirmState=this.event.request.intent.confirmationStatus;
        if (dialogState === "STARTED" || dialogState !== "COMPLETED") {
            this.emit(":delegate",this.event.request.intent);
          }
            else if(confirmState!=="CONFIRMED")
         {
             this.response.speak("okay the request has been cancelled "+HELP_MESSAGE).listen(HELP_REPROMPT);
    this.emit(':responseReady');
         }
 else{
            
            sv.attributes['defaulttime']=sv.event.request.intent.slots.EventTime.value;
            console.log("Event time : : "+sv.attributes['defaulttime']);
            sv.attributes['setdefault']=def;
            if(sv.event.request.intent.slots.freqone.value!=undefined&&sv.event.request.intent.slots.freqone.value!='?')
            sv.attributes['freq1']=Number(sv.event.request.intent.slots.freqone.value);
            if(sv.event.request.intent.slots.freqtwo.value!=undefined&&sv.event.request.intent.slots.freqtwo.value!='?')
            sv.attributes['freq2']=Number(sv.event.request.intent.slots.freqtwo.value);
            if(sv.event.request.intent.slots.freqthree.value!=undefined&&sv.event.request.intent.slots.freqthree.value!='?')
            sv.attributes['freq3']=Number(sv.event.request.intent.slots.freqthree.value);
            if(sv.event.request.intent.slots.freqfour.value!=undefined&&sv.event.request.intent.slots.freqfour.value!='?')
            sv.attributes['freq4']=Number(sv.event.request.intent.slots.freqfour.value);
            
      
        let speechout= "I have successfully added the custom time "+sv.attributes['defaulttime']+" and custom frequency "+sv.attributes['freq1']+" "+sv.attributes['freq2']+" "+sv.attributes['freq3']+" " +sv.attributes['freq4']+" for revisions";
       
        sv.response.cardRenderer(SKILL_NAME, speechout);
        sv.response.speak(speechout);
        sv.emit(':responseReady');
    
        }}
    
            ,
            'resetIntent':function(){
                let confirmState=this.event.request.intent.confirmationStatus;
                 let dialogState = this.event.request.dialogState;
        if (dialogState === "STARTED" || dialogState !== "COMPLETED") {
            this.emit(":delegate",this.event.request.intent);
          }
          else if(confirmState!=="CONFIRMED")
         {
             this.response.speak("okay the request has been cancelled "+HELP_MESSAGE).listen(HELP_REPROMPT);
    this.emit(':responseReady');
         }
                this.attributes['defaulttime']="null";
                this.attributes['setdefault']="no";
                let speechout= "I have successfully cleared your default preferences for revision time";
       
       this.response.cardRenderer(SKILL_NAME,speechout);
        this.response.speak(speechout);
        this.emit(':responseReady');
                
            }
            ,
    'tellScheduleIntent': function(){
        let dialogState = this.event.request.dialogState;
        console.log("in intent ");
        if (dialogState === "STARTED" ||dialogState !== "COMPLETED") {
            console.log("in if ");
            this.emit(":delegate",this.event.request.intent);
          }
    
            console.log("in else 1 ");
        let sv=this;
        let dt=new Date(sv.event.request.intent.slots.EventsDate.value);
        let tm=new Array();
        let dt1=dt.toDateString();
        let doc=new AWS.DynamoDB.DocumentClient();
        let schedule=new Array();
        let params={
                        TableName: "revisionList",
                        KeyConditionExpression: "#userId = :a ",
                         ExpressionAttributeNames: {
                                                         "#userId":"userId",
                                                    },
                         ExpressionAttributeValues: {
                                                         ":a": global.userId
                                                    }
                   };
        doc.query(params,function(err, data) {
        if (err) {
            console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
             let speechout= "I'm sorry there seems to be a problem";
        
        sv.response.cardRenderer(SKILL_NAME, speechout);
        sv.response.speak(speechout).listen(HELP_MESSAGE);
        sv.emit(':responseReady');
        } 
        else {
           
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            let size = Number(data.ScannedCount);//Object.keys(data).length;
          console.log("size:"+size);
            for(let i=0;i<size;i++)
            {
                let datecheck;
            for(let j=0;j<4;j++)
            {
                datecheck=new Date(data.Items[i].reminderdate[j]);
                console.log("Data "+i+" :: "+data.Items[i]);
                if(datecheck>=dt)
                break;
            }
            if(datecheck.toDateString()==dt1)
            {
              
            schedule.push(data.Items[i].revisionname);
            tm.push(datecheck.toLocaleTimeString());
            }
            }
            console.log("schedule has ::"+schedule);
            let speechout="You have";
            if(schedule.length)
            {
        for(let i=0;i<schedule.length;i++){
            if(i==(schedule.length-1)&&schedule.length>1)
            speechout+=" and ";
            let index=schedule[i].indexOf(":");
            speechout+=(" "+schedule[i].substr(index+1));
            if(schedule[i].substr(0,index)!="undefined")
            speechout+=(" from "+schedule[i].substr(0,index));
            speechout+=(" at "+tm[i].substr(0,tm[i].indexOf(":",3))+tm[i].substr(-3));
            
        }}
        else
        speechout+=" nothing";
       speechout+=" scheduled for "+weekday[dt.getDay()]+" "+dt.getDate()+"th "+month[dt.getMonth()];
       
        sv.response.cardRenderer(SKILL_NAME,speechout);
        sv.response.speak(speechout);
        sv.emit(':responseReady');

        }
     });
        
        
   },

    'AMAZON.HelpIntent': function () {
        const speechOutput = HELP_MESSAGE;
        const reprompt = HELP_REPROMPT;

        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
};

exports.handler = function (event, context, callback) {
    global.token = event.session.user.accessToken;
    global.userId = event.session.user.userId;

    const alexa = Alexa.handler(event, context, callback);
    alexa.APP_ID = APP_ID;
   alexa.registerHandlers(handlers);
   alexa.dynamoDBTableName='defaultList';
    alexa.execute();
};

function isSlotValid(request, slotName){
        var slot = request.intent.slots[slotName];
       
        //if we have a slot
        if (slot && slot.value) {
            //we have a value in the slot

            return slot.value;
        } else {
            //we didn't get a value in the slot.
            return false;
        }
}

function insertEvent(alexa,auth,event,speechout) {

var calendar = google.calendar('v3');
for(let i=0;i<4;i++){
calendar.events.insert({
  auth: auth,
  calendarId: 'primary',
  resource: event[i],
}, function(err, event) {
  if (err) {
    console.log('There was an error contacting the Calendar service: ' + err);
    return;
  }
  console.log('Event created: %s', event.htmlLink);
});
}
alexa.response.cardRenderer(SKILL_NAME, speechout);
        alexa.response.speak(speechout);
        alexa.emit(':responseReady');
return;
}
String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

// Purpose: To set the credentials from the client_secret.json and checks if the token is valid
// param(in): credentials: Authentication information of user from client_secret.json
// param(in):       token: The access token received from the lambda request and google
// param(in):    callback: A function that handles the error or returns the authentication information


function authorise (token, callback, alexa,eventadd,toggle,speechout) {
  fs.readFile(clientSecretsFile.toString(), function (err, content) {
    if (err) {
      console.log('Error Loading client secret file: ' + err);
      alexa.emit(':tell', 'There was an issue reaching the skill, please try again later');
    }
    let credentials = JSON.parse(content);
    let clientSecret = credentials.web.client_secret;
    let clientId = credentials.web.client_id;
    let redirectUrl = credentials.web.redirect_uris[0];
   
    let oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUrl);
    // Check if we have previously stored a token
    oauth2Client.setCredentials({
      access_token: token
    });
    if (token === undefined) {
      console.log('Token is undefined, please link the skill');
        
      if(toggle)
      {
          alexa.emit(':askWithLinkAccountCard','Welcome to Revise Smart<break time="1s"/> Please link Revise Smart to your Google Account Calendar ,it is not necessary but if you wish for the reminders to appear in your google calendar please use the Alexa App to link the account. If you wish to continue without account linking The following commands are available<break time="1s"/> I studied <break time="500ms"/>topicname <break time="500ms"/>and <break time="500ms"/>subjectname to schedule a revision reminder<break time="1s"/> Show me all the revisions set for today <break time="1s"/>Customize my revision time <break time="1s"/>or you could reset your customization by saying <break time="1s"/>Reset my preferences<break time="1s"/>  What would you like me to do');
      }
      else{
          alexa.emit(':tellWithLinkAccountCard',speechout+" The event has not been added to your google calendar as your google calendar account is not linked. It is not necessary but if you wish to add the event to your google calendar, link the account using the Alexa app. ");

      }
      return;
    }
   
    return callback(alexa,oauth2Client,eventadd,speechout);
  });
}
function noevent(alexa,auth,event,speechout){
            alexa.response.cardRenderer(SKILL_NAME, cINSTRUCTIONS);
      alexa.response.speak(INSTRUCTIONS).listen(INSTRUCTIONS);
    alexa.emit(':responseReady');
        }