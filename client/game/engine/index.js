/**
 * Pseudocode:
 * 1) Store game state (time, moves, tokens, selected/matched cards).
 * 2) Handle actions like START_STAGE, FLIP_CARD, MATCH_SUCCESS/FAIL.
 * 3) Emit telemetry and enforce rules later.
 */

export const createInitialState = () => ({
  stageId: 1,
  timeRemaining: 0,
  movesRemaining: 0,
  tokens: 0,
  selectedCardIds: [],
  matchedCardIds: [],
  status: "idle",
});

export const gameReducer = (state, action) => {
  switch (action.type) {
    case "START_STAGE":
      return {
        ...state,
        stageId: action.stageId,
        status: "playing",
        selectedCardIds: [],
        matchedCardIds: [],
        tokens: 0,
        // TODO: hydrate timers/moves from stage config.
      };
    case "FLIP_CARD":
      // TODO: enforce move usage on pair attempt and emit telemetry.
      return { ...state, selectedCardIds: [...state.selectedCardIds, action.cardId] };
    case "MATCH_SUCCESS":
      return {
        ...state,
        selectedCardIds: [],
        matchedCardIds: [...state.matchedCardIds, ...action.cardIds],
        // TODO: award tokens and check for completion.
      };
    case "MATCH_FAIL":
      return {
        ...state,
        selectedCardIds: [],
        // TODO: apply mismatch penalties and consume move.
      };
    case "TICK":
      return { ...state, timeRemaining: state.timeRemaining - action.deltaSeconds };
    case "USE_HELPER":
      // TODO: validate token costs and apply helper effects.
      return state;
    case "QUIT":
      return { ...state, status: "failed" };
    case "RESET_STAGE":
      return createInitialState();
    default:
      return state;
  }
};
