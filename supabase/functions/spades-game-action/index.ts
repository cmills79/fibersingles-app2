// supabase/functions/spades-game-action/index.ts

import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// --- Card and Game Logic Utilities ---
// These helpers will now live on the server to ensure consistent game rules.
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const createDeck = () => {
  const deck = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({ suit, rank, value: RANKS.indexOf(rank) + 2 });
    });
  });
  return shuffleDeck(deck);
};

const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const dealCards = (deck, playerIds) => {
  const hands = {};
  playerIds.forEach(id => { hands[id] = []; });
  
  deck.forEach((card, index) => {
    const playerId = playerIds[index % 4];
    hands[playerId].push(card);
  });

  // Sort hands
  Object.keys(hands).forEach(playerId => {
    hands[playerId].sort((a, b) => {
      if (a.suit !== b.suit) return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
      return a.value - b.value;
    });
  });
  return hands;
};

// --- Main Server Function ---
serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization')!
    const { user } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { action, payload } = await req.json();

    // --- Action Handler ---
    switch (action) {
      case 'create_game': {
        // Payload: { team1_player2_id, team2_player1_id, team2_player2_id }
        const playerIds = [user.id, payload.team1_player2_id, payload.team2_player1_id, payload.team2_player2_id];
        
        // 1. Create initial game state
        const deck = createDeck();
        const hands = dealCards(deck, playerIds);

        const initialGameState = {
          player_hands: hands,
          current_turn_player_id: playerIds[0], // Player 1 starts bidding
          bids: {},
          current_trick: [],
          tricks_taken: { team1: 0, team2: 0 },
          spades_broken: false,
          last_action: "Game created. Waiting for bids."
        };

        // 2. Create game record in database
        const { data: game, error } = await supabaseAdmin
          .from('spades_games')
          .insert({
            team1_player1_id: user.id,
            team1_player2_id: payload.team1_player2_id,
            team2_player1_id: payload.team2_player1_id,
            team2_player2_id: payload.team2_player2_id,
            status: 'bidding',
            game_state: initialGameState
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ gameId: game.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Note: `submit_bid` and `play_card` actions would be implemented here following a similar pattern:
      // 1. Fetch the current game state from the database.
      // 2. Validate the action (is it the player's turn? is the move legal?).
      // 3. Update the `game_state` JSONB object.
      // 4. Save the new state back to the database.
      // 5. Use Supabase Broadcast to send the new state to all players.

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
