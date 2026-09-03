import type {
  CharacterRow,
  LorebookRow,
  PersonaRow,
} from "@/lib/db/schema/rows";
import type { MacroScope } from "./macros";

export type GreetingSource = {
  greetings: string[];
  characterId: string | null;
  scope: MacroScope;
};

// A bound character's first message wins; a lorebook greeting is the fallback
// for chats that bind no character, or one that opens with nothing.
export function resolveGreetingSource(args: {
  character: CharacterRow | null;
  lorebooks: LorebookRow[];
  persona: PersonaRow | null;
}): GreetingSource | null {
  const user = args.persona?.name ?? "User";
  const user_description = args.persona?.description ?? "";
  const char = args.character;
  if (char?.firstMessage) {
    return {
      greetings: [char.firstMessage, ...(char.alternateGreetings ?? [])],
      characterId: char.id,
      scope: {
        user,
        char: char.name,
        user_description,
        char_description: char.description ?? "",
        scenario: char.scenario ?? "",
        personality: char.personality ?? "",
        vars: {},
      },
    };
  }
  const greeting = args.lorebooks.find((b) => b.greeting?.trim())?.greeting;
  if (!greeting) return null;
  return {
    greetings: [greeting],
    characterId: null,
    scope: {
      user,
      char: "Assistant",
      user_description,
      char_description: "",
      scenario: "",
      personality: "",
      vars: {},
    },
  };
}
