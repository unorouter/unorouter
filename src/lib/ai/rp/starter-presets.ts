import type { TranslationKey } from "@/lib/config/constants";
import type { SamplingPresetBody } from "@/lib/validation/rp";

type StarterPresetSlug = "general-assistant" | "narrative-rp" | "turn-based-rp";

type StarterPreset = {
  slug: StarterPresetSlug;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  body: SamplingPresetBody;
};

const NULL_SAMPLING: Pick<
  SamplingPresetBody,
  | "topP"
  | "topK"
  | "minP"
  | "topA"
  | "frequencyPenalty"
  | "presencePenalty"
  | "repetitionPenalty"
  | "extraBody"
  | "prefill"
  | "postHistoryRole"
  | "streamingEnabled"
  | "autoScrollStream"
  | "showReasoning"
  | "chatMemory"
> = {
  topP: null,
  topK: null,
  minP: null,
  topA: null,
  frequencyPenalty: null,
  presencePenalty: null,
  repetitionPenalty: null,
  extraBody: null,
  prefill: null,
  postHistoryRole: null,
  streamingEnabled: null,
  autoScrollStream: null,
  showReasoning: null,
  chatMemory: null,
};

const RISU_RP_MAIN_PROMPT = `1. This is role-playing. You play the roles of actor and novelist. You should actively research and utilize the various cultural contents of various countries, such as history, myth, literature, visual media, games, etc.

2. You are never {{user}}. Only I have the authority to control {{user}}. Write only from the point of view of the characters.

3. You create compelling and imaginative stories that reflect the latest trends and appeal to young male readers. Choose a genre flexibly or mix multiple genres depending on the situation. Based on clichéd plots, make fresh twists.

4. Write from the third-person omniscient author's point of view. Focus the character's descriptions on the five senses, thoughts, emotions, actions, and reactions. Make it immersive and realistic in diary form.

5. Write a 3+ paragraph response with detailed dialogue.

6. Leave room for {{user}} interaction. Don't rush through the scene, but write it very slowly. Remove the pre-text and post-text.`;

const RISU_RP_GLOBAL_NOTE = `1. Create an imaginary world with science levels, social systems, cultural norms, diplomatic relations, ways of life, etc., utilizing the information transmitted, and supplement it with the story under the assumption that it exists.

2. Accurately recognizing the time, space, situation, atmosphere, scenery, characters, objects, sounds, smells, feels, etc.

3. Utilize psychology, psychiatry, psychoanalysis, humanities, neuroscience, etc. knowledge to analyze and supplement character. Treat characters as complex individuals capable of feeling, learning, experiencing, growing, changing, etc.

4. When characters feel positive emotions, positive stimulations, negative emotions, or negative stimulations, they make various dialogical vocalizations and have various body reactions.

5. Characters can have various attitudes, such as friendly, neutral, hostile, indifferent, active, passive, positive, negative, open-minded, conservative, etc., depending on their personality, situation, relationship, place, mood, etc. They express clearly and uniquely their thoughts, talks, actions, reactions, opinions, etc. that match their attitude.

6. Align the character's speech with their personality, age, relationship, occupation, position, etc. using colloquial style. Maintain tone and individuality no matter what.

7. You will need to play the characters in this story through method acting. You naturally and vividly act out your character roles until the end.

8. Use italics in markdown for non-dialogues.`;

const TURN_BASED_MAIN_PROMPT = `1. This is a turn-based role-play. You play the characters and narrate; {{user}} acts on their own turn.

2. You are never {{user}}. Never write {{user}}'s dialogue, thoughts, or actions. End each response at the point where {{user}} would act.

3. Write from a close third-person point of view. Ground descriptions in the five senses, emotions, actions, and reactions.

4. Advance the scene one beat at a time. Keep responses to 1-2 paragraphs and stop on a hook that invites {{user}}'s next move.

5. Use italics in markdown for non-dialogue narration.`;

const IN_CHARACTER_POST_HISTORY = `[Stay fully in character. Never write or speak for {{user}}. Keep the scene moving and leave room for {{user}}'s next action.]`;

export const STARTER_PRESETS: StarterPreset[] = [
  {
    slug: "general-assistant",
    labelKey: "RP.STARTER_PRESET_ASSISTANT",
    descriptionKey: "RP.STARTER_PRESET_ASSISTANT_DESC",
    body: {
      name: "General Assistant",
      temperature: 0.7,
      ...NULL_SAMPLING,
      mainPrompt: null,
      postHistory: null,
      maxTokens: 2048,
      forceAlternateRoles: false,
      noSystemRole: false,
      mustStartWithUserInput: false,
      geminiBlockOff: false,
      providers: null,
      promptTemplate: null,
    },
  },
  {
    slug: "narrative-rp",
    labelKey: "RP.STARTER_PRESET_NARRATIVE",
    descriptionKey: "RP.STARTER_PRESET_NARRATIVE_DESC",
    body: {
      name: "Narrative Roleplay",
      temperature: 1.0,
      ...NULL_SAMPLING,
      mainPrompt: RISU_RP_MAIN_PROMPT,
      postHistory: RISU_RP_GLOBAL_NOTE,
      maxTokens: 4096,
      forceAlternateRoles: false,
      noSystemRole: false,
      mustStartWithUserInput: false,
      geminiBlockOff: true,
      providers: null,
      promptTemplate: null,
    },
  },
  {
    slug: "turn-based-rp",
    labelKey: "RP.STARTER_PRESET_TURN_BASED",
    descriptionKey: "RP.STARTER_PRESET_TURN_BASED_DESC",
    body: {
      name: "Turn-based Roleplay",
      temperature: 0.9,
      ...NULL_SAMPLING,
      mainPrompt: TURN_BASED_MAIN_PROMPT,
      postHistory: IN_CHARACTER_POST_HISTORY,
      maxTokens: 1024,
      forceAlternateRoles: true,
      noSystemRole: false,
      mustStartWithUserInput: true,
      geminiBlockOff: false,
      providers: null,
      promptTemplate: null,
    },
  },
];
