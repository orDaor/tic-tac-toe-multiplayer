//send request to create a new game session
async function startNewGame(event) {
  //prevent form from being submitted
  event.preventDefault();

  //extract form input value
  const formData = new FormData(event.target);
  const playerData = {
    name: formData.get("playername"),
  };

  //config ajax POST request to create a game session in the server for this client
  let response = {};
  const url = `/game/new`;
  const requestConfig = {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "CSRF-Token": csrfTokenElement.content,
    },
    body: JSON.stringify(playerData),
  };

  //send ajax request
  try {
    response = await fetch(url, requestConfig);
  } catch (error) {
    const errorMessage = "Can not reach the server now, maybe try later?";
    displayFormErrorMessage(errorMessage);
    return;
  }

  //parse response data
  const responseData = await response.json();

  //response with error code
  if (!response.ok || responseData.inputNotValid) {
    displayFormErrorMessage(responseData.message);
    return;
  }

  //operation was successful, display gameboard and correct game info
  hideGameConfigSection();
  displayActiveGameSection();

  //display players names of the room found for the client
  setPlayersData(responseData.players);

  //decide whether the client can start selecting cells depending on which player number
  //the server assigned him in the assiged room
}
