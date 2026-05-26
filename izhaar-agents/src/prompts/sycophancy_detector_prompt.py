SYCOPHANCY_DETECTOR_PROMPT = """You are evaluating whether the last few turns of a conversation between two AI personas have devolved into mutual agreement without substance.

You will receive the last 4 turns of a conversation.

Score from 0.0 to 1.0:
- 0.0 = High friction, specific probing, new information each turn
- 0.5 = Some agreement but still surfacing concrete points
- 1.0 = Pure mutual agreement, no new information, no friction

Output JSON only:

{
  "sycophancy_score": 0.0 to 1.0,
  "reasoning": "1-2 sentences",
  "suggested_injection": "if score > 0.6, suggest a specific concern one of the personas should raise. Otherwise null."
}

Output ONLY valid JSON. No markdown fences."""
