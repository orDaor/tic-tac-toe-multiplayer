//imports built in

//inports 3rd party

//imports custom
const Room = require("../models/room-model");
const Player = require("../models/player-model");
const validation = require("../utils/validation-util");
const sessionUtil = require("../utils/sessions-util");

//associate the client as a player number to a new game room
async function joinRandomRoom(req, res, next) {
  //init response data
  let responseData = {};
  //validate user input
  if (!validation.isUserInputValid(req.body)) {
    responseData.message =
      "Please choose a valid name with at least 3 characters";
    responseData.inputNotValid = true;
    res.json(responseData);
    return;
  }

  //check if a room is already assigned to the session
  const sessionGameData = req.session.gameData;
  let roomId;
  if (sessionGameData) {
    roomId = sessionGameData.roomId;
  } else {
    roomId = null;
  }

  //look for an existing available game room
  let availableRoom;
  let playerNumber;
  let symbol;
  let player;
  try {
    availableRoom = await Room.findAvailableAndBlock(roomId);
  } catch (error) {
    next(error);
    return;
  }

  //if no available room was found, create a new one
  if (!availableRoom) {
    const newRoom = Room.createEmpty();

    //find a player number and symbol for the client
    playerNumber = newRoom.getAvailablePlayerSlot(); //default = 1 in an empty room
    symbol = newRoom.getAvailableGameSymbol(); //default = X in an empty room

    //create a player with the user input data and save it inside the room
    player = new Player(req.body.name, symbol, playerNumber, true, false);
    newRoom.addPlayer(player);

    //save the new created room in the DB
    let newRoomId;
    try {
      newRoomId = await newRoom.save();
    } catch (error) {
      next(error);
      return;
    }

    //update room object
    newRoom.roomId = newRoomId.toString();

    //map the client to the saved room by its session
    sessionUtil.saveGameSession(req, {
      roomId: newRoom.roomId,
      playerNumber: playerNumber,
    });

    //set and send response data
    responseData.players = newRoom.players;
    responseData.gameStatus = newRoom.gameStatus;
    responseData.playerNumber = playerNumber;
    responseData.isYourTurn = true;
    res.json(responseData);
    return;
  }

  //check if both player slots are availabe in the room found
  const areBothPlayerStolsAvailable =
    availableRoom.isPlayerSlotAvailable(1) &&
    availableRoom.isPlayerSlotAvailable(2);

  //check if client is first player to join the found room
  let hasPlayerTurn;
  if (areBothPlayerStolsAvailable) {
    //no other player was found in this available room
    hasPlayerTurn = true;
  } else {
    if (availableRoom.gameStatus.getCurrentTurn()) {
      //another player was found which already did his move
      hasPlayerTurn = true;
    } else {
      //another player was found which did not do his move yet
      hasPlayerTurn = false;
    }
  }

  //connect the client to the room room with an available player stol (player number) 1 or 2
  playerNumber = availableRoom.getAvailablePlayerSlot();
  symbol = availableRoom.getAvailableGameSymbol();

  //create a player with the user input data and save it inside the room
  player = new Player(
    req.body.name,
    symbol,
    playerNumber,
    hasPlayerTurn,
    false
  );
  availableRoom.addPlayer(player);

  //un-block the room
  availableRoom.blocked = false;

  //update the room in the DB with the new values
  try {
    await availableRoom.save();
  } catch (error) {
    next(error);
    return;
  }

  //the room was update successfully in the DB...
  //map the client to the saved room by its session
  sessionUtil.saveGameSession(req, {
    roomId: availableRoom.roomId,
    playerNumber: playerNumber,
  });

  //set and send response data
  responseData.players = availableRoom.players;
  responseData.gameStatus = availableRoom.gameStatus;
  responseData.playerNumber = playerNumber;
  responseData.isYourTurn = hasPlayerTurn;
  res.json(responseData);
  return;
}

//create and join a new private room where to invite a friend
async function createAndJoinPrivateRoom(req, res, next) {
  //init response data
  let responseData = {};
  //validate user input
  if (!validation.isUserInputValid(req.body)) {
    responseData.message =
      "Please choose a valid name with at least 3 characters";
    responseData.inputNotValid = true;
    res.json(responseData);
    return;
  }

  const newRoom = Room.createEmpty();

  //find a player number and symbol for the client
  playerNumber = newRoom.getAvailablePlayerSlot(); //default = 1 in an empty room
  symbol = newRoom.getAvailableGameSymbol(); //default = X in an empty room

  //create a player with the user input data and save it inside the room
  player = new Player(req.body.name, symbol, playerNumber, true, false);
  newRoom.addPlayer(player);

  //save the new created room in the DB
  let newRoomId;
  try {
    newRoomId = await newRoom.save();
  } catch (error) {
    next(error);
    return;
  }

  //update room object
  newRoom.roomId = newRoomId.toString();

  //map the client to the saved room by its session
  sessionUtil.saveGameSession(req, {
    roomId: newRoom.roomId,
    playerNumber: playerNumber,
  });

  //set and send response data
  responseData.players = newRoom.players;
  responseData.gameStatus = newRoom.gameStatus;
  responseData.playerNumber = playerNumber;
  responseData.isYourTurn = true;
  responseData.invitationUrl = `http://localhost:3000/game/friend/${newRoom.roomId}`;
  res.json(responseData);
  return;
}

//join a private room from a friend invitation
async function joinPrivateRoom(req, res, next) {}

//export
module.exports = {
  joinRandomRoom: joinRandomRoom,
  createAndJoinPrivateRoom: createAndJoinPrivateRoom,
  joinPrivateRoom: joinPrivateRoom,
};
