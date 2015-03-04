'use strict';

function PlayController(parent) {
  this.parentController = parent;
  this.game = parent.game;
}

PlayController.prototype.onBuildRequest = function(req) {
  var currentPlayer = this.game.currentPlayer;

  if (currentPlayer.id !== req.playerId) {
    return;
  }

  if (req.data.buildType === 'road') {
    this.onBuildRoadRequest(req, currentPlayer);
  }
  else if (req.data.buildType === 'settlement') {
    this.onBuildSettlementRequest(req, currentPlayer);
  }
  else if (req.data.buildType === 'city') {
    this.onBuildCityRequest(req, currentPlayer);
  }
};

PlayController.prototype.onBuildRoadRequest = function(req, player) {
  var hasRequiredResources,
      roads,
      hasAllowance,
      buildableEdges,
      validSpot;

  hasRequiredResources = player.hasResources({
    lumber: 1,
    brick: 1
  });

  if (hasRequiredResources) {

    roads = this.game.board.edges.query({ owner: player });
    hasAllowance = roads.length < this.game.allowance.roads;

    if (hasAllowance) {

      buildableEdges = this.game.getBuildableEdgesForPlayer(player);
      validSpot = buildableEdges.some(function(edge) {
        return edge.id === req.data.buildId;
      });

      if (validSpot) {
        req.emit('Build', {
          playerId: player.id,
          buildType: 'road',
          buildId: req.data.buildId
        });
      }
    }
  }
};

PlayController.prototype.onBuildSettlementRequest = function(req, player) {
  var hasRequiredResources,
      settlements,
      hasAllowance,
      buildableSpots,
      validSpot;

  hasRequiredResources = player.hasResources({
    lumber: 1,
    brick: 1,
    wool: 1,
    grain: 1
  });

  if (hasRequiredResources) {

    settlements = this.game.board.corners.query({
      owner: player,
      settlement: true
    });
    hasAllowance = settlements.length < this.game.allowance.settlements;

    if (hasAllowance) {

      buildableSpots = this.game.getBuildableCornersForPlayer(player);
      validSpot = buildableSpots.some(function(corner) {
        return corner.id === req.data.buildId;
      });

      if (validSpot) {
        req.emit('Build', {
          playerId: player.id,
          buildType: 'settlement',
          buildId: req.data.buildId
        });
      }
    }
  }
};

PlayController.prototype.onBuildCityRequest = function(req, player) {
  var hasRequiredResources,
      settlements,
      cities,
      hasAllowance,
      buildableSpots,
      validSpot;

  hasRequiredResources = player.hasResources({
    ore: 3,
    grain: 2
  });

  if (hasRequiredResources) {

    settlements = this.game.board.corners.query({
      owner: player,
      settlement: true
    });

    cities = this.game.board.corners.query({
      owner: player,
      city: true
    });

    hasAllowance = cities.length < this.game.allowance.cities;

    if (hasAllowance) {

      buildableSpots = settlements;
      validSpot = buildableSpots.some(function(corner) {
        return corner.id === req.data.buildId;
      });

      if (validSpot) {
        req.emit('Build', {
          playerId: player.id,
          buildType: 'city',
          buildId: req.data.buildId
        });
      }
    }
  }
};

module.exports = PlayController;
