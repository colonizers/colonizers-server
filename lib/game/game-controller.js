'use strict';

var Chance = require('chance'),
    uuid = require('node-uuid'),
    PlayerRequest = require('./controller/player-request'),
    SetupController = require('./controller/setup-controller'),
    PlayController = require('./controller/play-controller');

function GameController(game, emitter, playerEmitters) {
  this.game = game;
  this.emitter = emitter;
  this.chance = new Chance();

  this.events = {
    Build: this.onBuildRequest.bind(this),
    OfferTrade: this.onOfferTradeRequest.bind(this),
    EndTurn: this.onEndTurnRequest.bind(this)
  };

  this.subControllers = {
    setup: new SetupController(this),
    playing: new PlayController(this)
  };

  playerEmitters.forEach(function(player) {
    this.registerPlayerEmitter(player.id, player.emitter);
  }.bind(this));
}

GameController.prototype.getEventNames = function() {
  return Object.keys(this.events);
};

GameController.prototype.getSubController = function(phase) {
  return this.subControllers[phase || this.game.phase];
};

GameController.prototype.pushEvent = function(options) {
  var logger,
      req;

  if (options.logger) {
    logger = options.logger.child({
      reqId: uuid()
    });

    if (options.data) {
      logger.info(options.event + ' request.', options.data);
    } else {
      logger.info(options.event + ' request.');
    }
  }

  req = new PlayerRequest(logger, options.playerId,
                              this.emitter, options.data);

  if (this.events[options.event]) {
    this.events[options.event](req);
  }
};

GameController.prototype.start = function() {
  if (this.game.turn < 1) {
    this.emitter.emit('NextTurn', this.game.getDataForTurn(1));
  }
};

GameController.prototype.onEndTurnRequest = function(req) {
  if (req.playerId === this.game.currentPlayer.id) {
    var data = this.game.getDataForTurn(this.game.turn + 1);
    req.emit('NextTurn', data);
    if (data.phase === 'playing') {
      this.rollDice(req);
    }
  }
};

GameController.prototype.rollDice = function(req) {
  var die1 = this.chance.d6(),
      die2 = this.chance.d6(),
      total = die1 + die2,
      data = {
        die1: die1,
        die2: die2,
        total: total
      };

  req.emit('DiceRoll', data);

  if (total !== 7) {
    this.distributeResources(req, total);
  }
};

GameController.prototype.distributeResources = function(req, diceTotal) {
  var data = {},
      tiles = this.game.board.tiles.query({ value: diceTotal });

  this.game.players.forEach(function(player) {
    data[player.id] = {
      brick: 0,
      grain: 0,
      lumber: 0,
      ore: 0,
      wool: 0
    };
  });

  tiles.forEach(function(tile) {
    var tiles = tile.getAdjacentCorners();
    tiles.filter(function(corner) {
      return corner.owner != null;
    })
    .forEach(function(corner) {
      data[corner.owner][tile.type]++;

      if (corner.isCity)
        data[corner.owner][tile.type]++;
    });
  });

  req.emit('DistributeResources', data);
};

GameController.prototype.onBuildRequest = function(req) {
  var sub = this.getSubController();
  if (sub.onBuildRequest) {
    sub.onBuildRequest(req);
  }
};

GameController.prototype.onOfferTradeRequest = function(req) {
  if (req.playerId === this.game.currentPlayer.id) {
    var data = req.data;
    data.playerId = req.playerId;
    req.emit('OfferTrade', data);
  }
};

module.exports = GameController;
