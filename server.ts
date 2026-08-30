/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Intelligent fallback rule/command parser when Gemini API key is not yet configured
function fallbackNLP(transcript: string, _currentState: any) {
  const text = transcript.toLowerCase().trim();

  // 1. Check multi-device Home Routines FIRST
  // Routine 1 — Goodnight
  if (
    text.includes('goodnight') ||
    text.includes('good night') ||
    text.includes('going to sleep') ||
    text.includes('go to sleep') ||
    text.includes('time for bed') ||
    text.includes('bedtime') ||
    text.includes('sleep mode') ||
    text.includes('going to bed') ||
    text === 'sleep'
  ) {
    let targetLoc: string | null = null;
    if (text.includes('living room') || text.includes('living')) targetLoc = 'livingRoom';
    else if (text.includes('master') || text.includes('main bed') || text.includes('main bedroom') || text.includes('bedroom 1')) targetLoc = 'bedroomMain';
    else if (text.includes('bedroom 2') || text.includes('bed 2') || text.includes('guest bed')) targetLoc = 'bedroom2';
    else if (text.includes('bedroom 3') || text.includes('bed 3') || text.includes('studio')) targetLoc = 'bedroom3';

    return {
      type: 'routine',
      routine: {
        routineId: 'goodnight',
        requiresLocation: !targetLoc,
        targetLocation: targetLoc,
        title: 'Goodnight Routine',
        question: 'Where are you sleeping tonight?',
      },
      message: targetLoc
        ? 'Goodnight routine activated.'
        : 'Where are you sleeping tonight?',
    };
  }

  // Routine 2 — Bath Time
  if (
    text.includes('bath') ||
    text.includes('shower') ||
    text.includes('taking a bath') ||
    text.includes('take a bath') ||
    text.includes('going to the bathroom') ||
    text.includes('bath time') ||
    text.includes('bathroom')
  ) {
    let targetLoc: string | null = null;
    if (text.includes('guest') || text.includes('bath 2') || text.includes('bathroom 2') || text.includes('second bath')) targetLoc = 'bathroom2';
    else if (text.includes('main bath') || text.includes('master bath') || text.includes('bath 1') || text.includes('bathroom 1')) targetLoc = 'bathroomMain';

    return {
      type: 'routine',
      routine: {
        routineId: 'bath_time',
        requiresLocation: !targetLoc,
        targetLocation: targetLoc,
        title: 'Bath Time Routine',
        question: 'Which bathroom are you using?',
      },
      message: targetLoc
        ? 'Bath routine activated.'
        : 'Which bathroom are you using?',
    };
  }

  // Routine 3 — Leaving Home
  if (
    text.includes('leaving home') ||
    text.includes('leaving the house') ||
    text.includes("i'm leaving") ||
    text.includes('im leaving') ||
    text.includes('goodbye house') ||
    text.includes('goodbye') ||
    text.includes('heading out') ||
    text.includes('away mode') ||
    text === 'leaving'
  ) {
    return {
      type: 'routine',
      routine: {
        routineId: 'leaving_home',
        requiresLocation: false,
      },
      message: 'Leaving Home routine: entire house powered down and secured.',
    };
  }

  // Routine 4 — Entering Home
  if (
    text.includes("i'm home") ||
    text.includes('im home') ||
    text.includes('i am home') ||
    text.includes('entering home') ||
    text.includes('arrived home') ||
    text.includes('welcome home') ||
    text.includes('just got home') ||
    text.includes('back home') ||
    text.includes('arriving home')
  ) {
    return {
      type: 'routine',
      routine: {
        routineId: 'entering_home',
        requiresLocation: false,
      },
      message: 'Entering Home routine: Living Room AC, fan (low), and lights activated.',
    };
  }

  // Check if it's a preference / conditional rule
  if (
    text.includes('when') ||
    text.includes('if it') ||
    text.includes('whenever') ||
    text.includes('always close') ||
    text.includes('always turn') ||
    text.includes('rule') ||
    text.includes('preference')
  ) {
    let condition = 'rainy';
    let conditionDesc = 'Rainy weather';
    const updates: Record<string, any> = {};

    if (text.includes('rain') || text.includes('storm')) {
      condition = 'rainy';
      conditionDesc = 'When it rains';
      updates.livingRoom = { mainDoorOpen: false };
      updates.kitchen = { windowOpen: false };
      updates.garage = { garageDoorOpen: false };
    } else if (text.includes('winter') || text.includes('cold') || text.includes('snow')) {
      condition = 'winter';
      conditionDesc = 'Winter / Cold weather';
      updates.livingRoom = { acPower: false, fanPower: false };
      updates.bedroomMain = { acPower: false };
      updates.bedroom2 = { acPower: false, fanPower: false };
      updates.bedroom3 = { acPower: false };
      updates.diningRoom = { acPower: false };
    } else if (text.includes('sun') || text.includes('hot') || text.includes('summer')) {
      condition = 'sunny';
      conditionDesc = 'Sunny / Hot weather';
      updates.livingRoom = { acPower: true, acTemp: 70, fanPower: true };
      updates.bedroomMain = { acPower: true, acTemp: 68 };
      updates.bedroom2 = { acPower: true, acTemp: 70 };
    } else if (text.includes('night') || text.includes('dark') || text.includes('sleep')) {
      condition = 'night';
      conditionDesc = 'Nighttime / Sleep mode';
      updates.livingRoom = { mainDoorOpen: false, fanPower: false };
      updates.garage = { garageDoorOpen: false };
      updates.bedroomMain = { lightPower: false, lamp1Power: true, lamp1Intensity: 30 };
    } else {
      condition = 'custom';
      conditionDesc = `Condition: ${transcript}`;
      updates.livingRoom = { mainDoorOpen: false };
    }

    return {
      type: 'preference',
      preference: {
        id: `pref-${Date.now()}`,
        ruleText: transcript,
        condition,
        conditionDescription: conditionDesc,
        deviceUpdates: updates,
        summary: `Automate: ${conditionDesc} -> Update matching home devices`,
      },
      message: `Got it! I've saved a rule to execute whenever it's ${condition}: "${transcript}". You can see and trigger it in the Preferences panel.`,
    };
  }

  // Check direct device commands
  const updates: Record<string, any> = {};
  let handled = false;
  let responseText = '';

  if (text.includes('door') || text.includes('doors') || text.includes('lock')) {
    const isLockOrClose = text.includes('lock') || text.includes('close') || text.includes('shut');
    const open = !isLockOrClose;

    if (text.includes('garage')) {
      updates.garage = { garageDoorOpen: open };
      responseText = `I've ${open ? 'opened' : 'closed'} the garage door.`;
      handled = true;
    } else if (text.includes('all') || text.includes('exterior')) {
      updates.livingRoom = { mainDoorOpen: open };
      updates.garage = { garageDoorOpen: open };
      responseText = `I've ${open ? 'opened' : 'locked and secured'} all exterior doors.`;
      handled = true;
    } else {
      updates.livingRoom = { mainDoorOpen: open };
      responseText = `I've ${open ? 'unlocked and opened' : 'locked and closed'} the main front door.`;
      handled = true;
    }
  }

  if (text.includes('window') || text.includes('windows')) {
    const open = !text.includes('close') && !text.includes('shut');
    updates.kitchen = { windowOpen: open };
    responseText = `I've ${open ? 'opened' : 'closed and sealed'} the kitchen window.`;
    handled = true;
  }

  if (text.includes('light') || text.includes('lights') || text.includes('lamp') || text.includes('chandelier')) {
    const turnOn = !text.includes('off') && (text.includes('on') || text.includes('turn on') || text.includes('set') || text.includes('dim'));
    if (text.includes('all') || text.includes('every')) {
      updates.livingRoom = { lightPower: turnOn };
      updates.kitchen = { lightPower: turnOn };
      updates.bedroomMain = { lightPower: turnOn, lamp1Power: turnOn, lamp2Power: turnOn };
      updates.bedroom2 = { lightPower: turnOn, lampPower: turnOn };
      updates.bedroom3 = { lightPower: turnOn, lampPower: turnOn };
      updates.diningRoom = { lightPower: turnOn };
      updates.bathroomMain = { lightPower: turnOn };
      updates.bathroom2 = { lightPower: turnOn };
      updates.garage = { lightPower: turnOn };
      responseText = `I've turned ${turnOn ? 'on' : 'off'} all interior lights across all 9 zones.`;
      handled = true;
    } else if (text.includes('living')) {
      updates.livingRoom = { lightPower: turnOn };
      responseText = `I've turned ${turnOn ? 'on' : 'off'} the living room lights.`;
      handled = true;
    } else if (text.includes('kitchen')) {
      updates.kitchen = { lightPower: turnOn };
      responseText = `I've turned ${turnOn ? 'on' : 'off'} the kitchen lights.`;
      handled = true;
    } else if (text.includes('dining')) {
      updates.diningRoom = { lightPower: turnOn };
      responseText = `I've turned ${turnOn ? 'on' : 'off'} the dining room chandelier light.`;
      handled = true;
    } else if (text.includes('main bedroom') || text.includes('master bedroom') || text.includes('master suite')) {
      updates.bedroomMain = { lightPower: turnOn, lamp1Power: turnOn, lamp2Power: turnOn };
      responseText = `I've switched ${turnOn ? 'on' : 'off'} the master suite lights.`;
      handled = true;
    } else if (text.includes('bedroom 2') || text.includes('guest bedroom')) {
      updates.bedroom2 = { lightPower: turnOn, lampPower: turnOn };
      responseText = `I've turned ${turnOn ? 'on' : 'off'} Bedroom 2 lights.`;
      handled = true;
    } else if (text.includes('bedroom 3') || text.includes('studio') || text.includes('office')) {
      updates.bedroom3 = { lightPower: turnOn, lampPower: turnOn };
      responseText = `I've turned ${turnOn ? 'on' : 'off'} the studio lights.`;
      handled = true;
    } else if (text.includes('bathroom') || text.includes('bath')) {
      updates.bathroomMain = { lightPower: turnOn };
      updates.bathroom2 = { lightPower: turnOn };
      responseText = `I've turned ${turnOn ? 'on' : 'off'} bathroom lights.`;
      handled = true;
    } else if (text.includes('garage')) {
      updates.garage = { lightPower: turnOn };
      responseText = `I've turned ${turnOn ? 'on' : 'off'} the garage bay light.`;
      handled = true;
    } else {
      updates.livingRoom = { lightPower: turnOn };
      updates.bedroomMain = { lightPower: turnOn };
      updates.diningRoom = { lightPower: turnOn };
      responseText = `I've toggled ${turnOn ? 'on' : 'off'} the primary living lights.`;
      handled = true;
    }
  }

  if (text.includes('fan') || text.includes('fans')) {
    const turnOn = !text.includes('off') && (text.includes('on') || text.includes('turn on'));
    if (text.includes('exhaust') || text.includes('bathroom')) {
      updates.bathroomMain = { exhaustFanPower: turnOn };
      updates.bathroom2 = { exhaustFanPower: turnOn };
      responseText = `I've switched ${turnOn ? 'on' : 'off'} the bathroom exhaust fans.`;
      handled = true;
    } else if (text.includes('bedroom 2') || text.includes('guest')) {
      updates.bedroom2 = { fanPower: turnOn };
      responseText = `I've turned ${turnOn ? 'on' : 'off'} the fan in Bedroom 2.`;
      handled = true;
    } else {
      updates.livingRoom = { fanPower: turnOn };
      responseText = `I've turned ${turnOn ? 'on' : 'off'} the living room ceiling fan.`;
      handled = true;
    }
  }

  if (text.includes('ac') || text.includes('air conditioning') || text.includes('temp') || text.includes('climate') || text.includes('heat') || text.includes('cool')) {
    const turnOn = !text.includes('off') && (text.includes('on') || text.includes('set') || text.includes('turn on') || text.includes('to'));
    const tempMatch = text.match(/(\d{2})/);
    const targetTemp = tempMatch ? Math.min(85, Math.max(60, parseInt(tempMatch[1], 10))) : 72;

    if (text.includes('living')) {
      updates.livingRoom = { acPower: turnOn, ...(tempMatch ? { acTemp: targetTemp } : {}) };
      responseText = tempMatch
        ? `I've set the Living Room AC to ${targetTemp}°F.`
        : `I've turned ${turnOn ? 'on' : 'off'} the Living Room AC.`;
      handled = true;
    } else if (text.includes('bedroom') || text.includes('master')) {
      updates.bedroomMain = { acPower: turnOn, ...(tempMatch ? { acTemp: targetTemp } : {}) };
      responseText = tempMatch
        ? `I've set the Master Suite AC to ${targetTemp}°F.`
        : `I've turned ${turnOn ? 'on' : 'off'} the Master Suite AC.`;
      handled = true;
    } else {
      updates.livingRoom = { acPower: turnOn, ...(tempMatch ? { acTemp: targetTemp } : {}) };
      updates.bedroomMain = { acPower: turnOn, ...(tempMatch ? { acTemp: targetTemp } : {}) };
      responseText = tempMatch
        ? `I've adjusted the home climate to ${targetTemp}°F.`
        : `I've switched ${turnOn ? 'on' : 'off'} the primary HVAC system.`;
      handled = true;
    }
  }

  if (text.includes('chimney') || text.includes('hood') || text.includes('vent')) {
    const turnOn = !text.includes('off') && (text.includes('on') || text.includes('turn on'));
    updates.kitchen = { chimneyPower: turnOn };
    responseText = `I've turned ${turnOn ? 'on' : 'off'} the kitchen exhaust chimney.`;
    handled = true;
  }

  if (handled && Object.keys(updates).length > 0) {
    return {
      type: 'command',
      deviceUpdates: updates,
      message: responseText,
    };
  }

  // Conversational greetings & friendly chats
  const greetings = ['hi', 'hello', 'hey', 'hi hi', 'good morning', 'good afternoon', 'good evening', 'how are you', 'what can you do', 'help'];
  const trimmed = text.trim();
  if (greetings.some((g) => trimmed === g || trimmed.startsWith(g + ' ') || trimmed.startsWith(g + '!'))) {
    if (trimmed.includes('how are you')) {
      return {
        type: 'chat',
        message: `I'm doing well! All home systems and security sensors are operational. How can I assist you?`,
      };
    }
    if (trimmed.includes('what can you do') || trimmed.includes('help')) {
      return {
        type: 'chat',
        message: `I can control your lights, climate, doors, and fans across all 9 zones, execute multi-device routines like Goodnight or Leaving Home, and remember proactive weather automation rules.`,
      };
    }
    return {
      type: 'chat',
      message: `Hello! How can I assist you with your home today?`,
    };
  }

  return {
    type: 'chat',
    message: `I received your message. Let me know if you would like me to adjust devices, run a routine, or set an automation rule.`,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    const hasKey = Boolean(
      process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
        process.env.GEMINI_API_KEY.trim() !== ''
    );
    res.json({
      status: 'ok',
      hasApiKey: hasKey,
    });
  });

  // Home AI natural language processing endpoint
  app.post('/api/home-ai/process', async (req, res) => {
    try {
      const { transcript, currentState, _preferences, currentWeather } = req.body;
      if (!transcript || typeof transcript !== 'string') {
        res.status(400).json({ error: 'Transcript is required' });
        return;
      }

      const client = getGenAIClient();
      if (!client) {
        // Use intelligent local parser if API key is not provided
        const parsed = fallbackNLP(transcript, currentState);
        res.json({
          ...parsed,
          notice: 'Key note: Gemini API key not detected. Handled via local intelligent processor.',
          apiKeyPresent: false,
        });
        return;
      }

      const systemInstruction = `You are KeepSafe Home AI, an intelligent home automation system.
The home has the following rooms and controllable states:
- livingRoom: lightPower (boolean), mainDoorOpen (boolean), fanPower (boolean), fanSpeed (number 0-100), fanMode ('off'|'low'|'med'|'high'), acPower (boolean), acTemp (number 60-85)
- bedroomMain: lightPower (boolean), lamp1Power (boolean), lamp1Intensity (number 0-100), lamp2Power (boolean), lamp2Intensity (number 0-100), acPower (boolean), acTemp (number 60-85)
- bedroom2: lightPower (boolean), lampPower (boolean), lampIntensity (number 0-100), acPower (boolean), acTemp (number 60-85), fanPower (boolean), fanSpeed (number 0-100), fanMode ('off'|'low'|'med'|'high')
- bedroom3: lightPower (boolean), lampPower (boolean), lampIntensity (number 0-100), acPower (boolean), acTemp (number 60-85)
- diningRoom: lightPower (boolean), acPower (boolean), acTemp (number 60-85)
- kitchen: lightPower (boolean), chimneyPower (boolean), chimneySpeed ('low'|'med'|'high'|'turbo'), windowOpen (boolean)
- bathroomMain: lightPower (boolean), exhaustFanPower (boolean)
- bathroom2: lightPower (boolean), exhaustFanPower (boolean)
- garage: garageDoorOpen (boolean), lightPower (boolean)

Current Weather is: ${currentWeather || 'sunny'}
Current Home State: ${JSON.stringify(currentState || {})}

Analyze the user's spoken transcript carefully. Categorize it into ONE of four action types:
1. "routine": Multi-step preset home routines that coordinate actions across multiple rooms.
   Specifically recognize these four routines:
   - "goodnight": user phrases like "goodnight", "good night", "I'm going to sleep", "bedtime", "sleep mode", "going to bed".
     Set routine.routineId = "goodnight". If the user did NOT mention a specific room, set routine.requiresLocation = true. If they specifically named a room (e.g. "living room", "master suite", "bedroom 2", "studio"), set routine.requiresLocation = false and routine.targetLocation to that room key.
   - "bath_time": user phrases like "I'm taking a bath", "going to the bathroom", "bath time", "taking a shower", "shower time".
     Set routine.routineId = "bath_time". If the user did NOT mention a specific bathroom, set routine.requiresLocation = true. If they named "main bathroom" or "guest bath 2", set routine.requiresLocation = false and routine.targetLocation to "bathroomMain" or "bathroom2".
   - "leaving_home": user phrases like "leaving home", "I'm leaving", "goodbye house", "goodbye", "heading out", "leaving the house", "away mode".
     Set routine.routineId = "leaving_home", routine.requiresLocation = false.
   - "entering_home": user phrases like "I'm home", "entering home", "arrived home", "welcome home", "just got home", "back home".
     Set routine.routineId = "entering_home", routine.requiresLocation = false.

2. "command": Direct instruction to change one or more devices right now (e.g. "turn on master bedroom lights", "open the garage", "set living room temperature to 68", "turn off all lights", "close the kitchen window").
   Return 'deviceUpdates' object containing only the room keys and properties that should be changed.
   Provide a concise, polite 'message' describing what was done.

3. "preference": A conditional automation rule or preference the user wants remembered for the future (e.g. "I want doors and windows closed when it rains", "turn off the AC when it is winter", "turn on bedroom lamps whenever it gets dark", "close garage when I am away").
   DO NOT execute immediate state changes.
   Return 'preference' object with:
     - condition: one of "rainy", "sunny", "winter", "night", "away", or another short keyword
     - conditionDescription: readable trigger like "When it rains" or "During winter weather"
     - deviceUpdates: the object of room state changes to execute when that condition triggers
     - summary: clear plain text summary of the rule
   Provide a warm 'message' confirming the rule was recorded.

4. "chat": General question, conversational comment, or greeting not specifying a routine, device change, or automation rule.
   Provide a helpful, friendly 'message'.`;

      let responseText: string | null = null;

      // Multi-tier model resilience: Try gemini-3.6-flash, then fast fallback gemini-3.5-flash-lite
      const modelsToTry = ['gemini-3.6-flash', 'gemini-3.5-flash-lite'];

      for (const modelName of modelsToTry) {
        try {
          // Timeout protection: don't let a stalled model call block the response
          const generatePromise = client.models.generateContent({
            model: modelName,
            contents: transcript,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: 'Must be "routine", "command", "preference", or "chat"',
                  },
                  message: {
                    type: Type.STRING,
                    description: 'The natural spoken response to display to the user.',
                  },
                  routine: {
                    type: Type.OBJECT,
                    description: 'Details for "routine" type.',
                    nullable: true,
                    properties: {
                      routineId: {
                        type: Type.STRING,
                        description: 'One of "goodnight", "bath_time", "leaving_home", "entering_home"',
                      },
                      requiresLocation: {
                        type: Type.BOOLEAN,
                        description: 'True if a location clarification popup is needed.',
                      },
                      targetLocation: {
                        type: Type.STRING,
                        nullable: true,
                        description: 'Optional pre-specified room key if stated in prompt.',
                      },
                    },
                  },
                  deviceUpdates: {
                    type: Type.OBJECT,
                    description: 'Key-value map of room keys to updated properties for "command" type.',
                    nullable: true,
                  },
                  preference: {
                    type: Type.OBJECT,
                    description: 'Preference object for "preference" type.',
                    nullable: true,
                    properties: {
                      condition: { type: Type.STRING },
                      conditionDescription: { type: Type.STRING },
                      deviceUpdates: { type: Type.OBJECT },
                      summary: { type: Type.STRING },
                    },
                  },
                },
                required: ['type', 'message'],
              },
            },
          });

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Model timeout')), 6000)
          );

          const response = await Promise.race([generatePromise, timeoutPromise]);

          if (response?.text) {
            responseText = response.text;
            break;
          }
        } catch (apiErr: any) {
          console.warn(`Gemini tier ${modelName} unavailable (${apiErr?.message || 'transient'}). Attempting next tier...`);
        }
      }

      if (responseText) {
        let cleanedJson = responseText.trim();
        if (cleanedJson.startsWith('```json')) {
          cleanedJson = cleanedJson.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (cleanedJson.startsWith('```')) {
          cleanedJson = cleanedJson.replace(/^```/, '').replace(/```$/, '').trim();
        }

        try {
          const parsed = JSON.parse(cleanedJson);
          if (parsed.type === 'preference' && parsed.preference) {
            parsed.preference.id = `pref-${Date.now()}`;
            parsed.preference.ruleText = transcript;
          }

          res.json({
            ...parsed,
            apiKeyPresent: true,
          });
          return;
        } catch (parseErr) {
          console.warn('Failed to parse Gemini JSON output:', parseErr);
        }
      }

      // If all Gemini tiers failed or timed out, seamlessly use local rule parser
      const fallback = fallbackNLP(transcript, currentState || {});
      res.json({
        ...fallback,
        notice: 'Handled via KeepSafe local intelligent engine.',
        apiKeyPresent: true,
      });
    } catch (err: any) {
      console.warn('Handling request via local fallback parser:', err?.message || err);
      // Graceful fallback to local parser
      const fallback = fallbackNLP(req.body.transcript || '', req.body.currentState || {});
      res.json({
        ...fallback,
        notice: `Handled via local intelligent processor.`,
        apiKeyPresent: true,
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KeepSafe Server running on port ${PORT}`);
  });
}

startServer();
