const express = require('express');
const readline = require('readline');
const SpotifyWebApi = require('spotify-web-api-node');
require('dotenv').config();

const app = express();
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

// Scopes required for playlist modification
const scopes = ['playlist-modify-private', 'playlist-modify-public'];

// Set up express server
const server = app.listen(8888, () => {
  console.log('Server is listening on port 8888...');
});

// Set up readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to search for tracks
async function searchTrack(song) {
  try {
    const searchResult = await spotifyApi.searchTracks(song);
    return searchResult;
  } catch (error) {
    console.error('Error searching for tracks:', error);
    return null;
  }
}

async function createPlaylist(songs, accessToken) {
    try {
      console.log('Creating playlist...');
      spotifyApi.setAccessToken(accessToken);
      const user = await spotifyApi.getMe();
      console.log('User:', user);
      const playlist = await spotifyApi.createPlaylist(user.body.id, { name: 'test', public: false });
      console.log('Playlist:', playlist);
  
      const trackIds = [];
  
      for (const song of songs) {
        const tracks = await searchTrack(song);
        if (tracks && tracks.body && tracks.body.tracks && tracks.body.tracks.items.length > 0) {
          const trackUri = tracks.body.tracks.items[0].uri; // Get the URI of the first track
          if (trackUri) {
            trackIds.push(trackUri); // Push the URI to trackIds
          }
        }
      }
  
      console.log('Track URIs:', trackIds);
  
      if (trackIds.length > 0) {
        console.log('Adding tracks to the playlist...');
        const addTracksResponse = await spotifyApi.addTracksToPlaylist(playlist.body.id, trackIds);
        console.log('Add tracks response:', addTracksResponse);
        console.log('Playlist created successfully!');
      } else {
        console.log('No tracks found to add to the playlist.');
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
    }
}


// Endpoint to handle authorization callback
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const accessToken = data.body.access_token;
    console.log('Access token:', accessToken); // Log access token obtained after authorization

    // Read song names from terminal input and create the playlist
    rl.question('Enter song names separated by commas: ', async (input) => {
      const songs = input.split(',').map(song => song.trim());
      await createPlaylist(songs, accessToken);
      rl.close(); // Close readline interface
      server.close(); // Close server
    });

    res.send('Authorization successful! You can close this window.');
  } catch (error) {
    console.error('Error exchanging authorization code for access token:', error);
    res.status(500).send('Error during authorization. Please try again.');
  }
});

// Authorization URL
app.get('/login', (req, res) => {
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
  res.redirect(authorizeURL);
});

// Start the authorization process
app.get('/', (req, res) => {
  res.send('<a href="/login">Login with Spotify</a>');
});
