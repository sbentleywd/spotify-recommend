import { IPlaylist } from "../components/Choices/Choices";

let accessToken: string;
const clientId = "2605e63cad504fc6889cb31b91f1eff3";

const redirectUri =
	process.env.NODE_ENV === "production"
		? "https://spotify-recommend.netlify.app"
		: "http://localhost:3000";

document.body.onload = function () {
	if (document.getElementById("input") as HTMLInputElement) {
		if (!sessionStorage.getItem("searchTerm")) {
			(document.getElementById("input") as HTMLInputElement).value = "";
		} else {
			(document.getElementById(
				"input"
			) as HTMLInputElement).value = sessionStorage.getItem(
				"searchTerm"
			)!;
		}
	}
};

const SpotifyUtils = {
	getAccessToken() {
		if (accessToken) {
			return accessToken;
		}
		// check for access token match
		const accessTokenMatch = window.location.href.match(
			/access_token=([^&]*)/
		);
		const expiresInMatch = window.location.href.match(/expires_in=([^&]*)/);

		if (accessTokenMatch && expiresInMatch) {
			accessToken = accessTokenMatch[1];
			const expiresIn = Number(expiresInMatch[1]);
			window.setTimeout(() => (accessToken = ""), expiresIn * 1000);
			window.history.pushState("Access Token", "", "/");
			// Clears the parameters, allowing us to grab a new access token when it expires

			return accessToken;
		} else {
			const scopes =
				"playlist-modify-public user-library-read user-top-read streaming user-read-email user-read-private";
			const accessUri = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&scope=${encodeURIComponent(
				scopes
			)}&redirect_uri=${redirectUri}`;
			window.location.href = accessUri;
			return "";
		}
	},

	searchTracks(term: string) {
		sessionStorage.setItem("searchTerm", term);
		const accessToken = SpotifyUtils.getAccessToken();

		let endpoint = `https://api.spotify.com/v1/search?type=track&q=${term}`;

		return fetch(endpoint, {
			headers: { Authorization: `Bearer ${accessToken}` },
		})
			.then((response) => {
				return response.json();
			})
			.then((jsonResponse) => {
				if (!jsonResponse.tracks) {
					return [];
				}

				return jsonResponse.tracks.items.map(
					(track: {
						id: number;
						name: string;
						artists: any;
						album: any;
						uri: any;
					}) => ({
						id: track.id,
						name: track.name,
						artist: track.artists
							.map((artist: any) => {
								return artist.name;
							})
							.join(", "),
						medImg: track.album.images[1],
						smImg: track.album.images[2],
						uri: track.uri,
					})
				);
			});
	},

	searchArtists(term: string) {
		sessionStorage.setItem("searchTerm", term);
		const accessToken = SpotifyUtils.getAccessToken();

		let endpoint = `https://api.spotify.com/v1/search?type=artist&q=${term}`;

		return fetch(endpoint, {
			headers: { Authorization: `Bearer ${accessToken}` },
		})
			.then((response) => {
				return response.json();
			})
			.then((jsonResponse) => {
				if (!jsonResponse.artists) {
					return [];
				}

				return jsonResponse.artists.items.map((artist: any) => ({
					id: artist.id,
					name: artist.name,
					medImg: artist.images[1],
					smImg: artist.images[2],
					uri: artist.uri,
				}));
			});
	},

	getUserId() {
		const accessToken = SpotifyUtils.getAccessToken();
		const headers = { Authorization: `Bearer ${accessToken}` };

		return fetch("https://api.spotify.com/v1/me", { headers: headers })
			.then((response) => response.json())
			.then((jsonResponse) => {
				return jsonResponse.id;
			});
	},

	createPlaylist(name: string, trackUris: any[]) {
		if (!name || !trackUris.length) {
			return;
		}

		const accessToken = SpotifyUtils.getAccessToken();
		const headers = { Authorization: `Bearer ${accessToken}` };
		return SpotifyUtils.getUserId().then((id) => {
			return fetch(`https://api.spotify.com/v1/users/${id}/playlists`, {
				headers: headers,
				method: "POST",
				body: JSON.stringify({ name: name }),
			})
				.then((response) => response.json())
				.then((jsonResponse) => jsonResponse.id)
				.then((id) => {
					return SpotifyUtils.addToPlaylist(id, trackUris);
				});
		});
	},

	addToPlaylist(playlistId: string, trackUris: any[]) {
		const accessToken = SpotifyUtils.getAccessToken();
		const headers = { Authorization: `Bearer ${accessToken}` };

		return fetch(
			`https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
			{
				headers: headers,
				method: "POST",
				body: JSON.stringify({ uris: trackUris }),
			}
		);
	},

	getTopTracks(term: string) {
		const accessToken = SpotifyUtils.getAccessToken();
		const headers = { Authorization: `Bearer ${accessToken}` };

		return fetch(
			`https://api.spotify.com/v1/me/top/tracks?time_range=${term}`,
			{ headers: headers }
		)
			.then((response) => response.json())
			.then((jsonResponse) => {
				return jsonResponse.items.map((track: any) => ({
					id: track.id,
					name: track.name,
					artist: track.artists
						.map((artist: any) => {
							return artist.name;
						})
						.join(", "),
					medImg: track.album.images[1],
					smImg: track.album.images[2],
					uri: track.uri,
				}));
			});
	},

	getTopArtists(term: string) {
		const accessToken = SpotifyUtils.getAccessToken();
		const headers = { Authorization: `Bearer ${accessToken}` };

		return fetch(
			`https://api.spotify.com/v1/me/top/artists?time_range=${term}`,
			{
				headers: headers,
			}
		)
			.then((response) => response.json())
			.then((jsonResponse) => {
				return jsonResponse.items.map((artist: any) => ({
					id: artist.id,
					name: artist.name,
					medImg: artist.images[1],
					smImg: artist.images[2],
					uri: artist.uri,
				}));
			});
	},

	getPlaylists() {
		const accessToken = SpotifyUtils.getAccessToken();
		const headers = { Authorization: `Bearer ${accessToken}` };

		return fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
			headers: headers,
		})
			.then((response) => response.json())
			.then((jsonResponse) => {
				return jsonResponse.items.map(
					(playlist: {
						id: number;
						name: string;
						tracks: any;
						images: {}[];
					}) => ({
						id: playlist.id,
						name: playlist.name,
						length: playlist.tracks.total,
						img: playlist.images[2] || playlist.images[0],
					})
				);
			});
	},
	async getMyPlaylists() {
		const accessToken = SpotifyUtils.getAccessToken();
		const headers = { Authorization: `Bearer ${accessToken}` };

		const userId = await this.getUserId();

		return fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
			headers: headers,
		})
			.then((response) => response.json())
			.then((jsonResponse) => {
				return jsonResponse.items
					.filter(
						(playlist: {
							id: number;
							name: string;
							tracks: any;
							images: {}[];
							owner: any;
						}) => {
							return playlist.owner.id === userId;
						}
					)
					.map(
						(playlist: {
							id: number;
							name: string;
							tracks: any;
							images: {}[];
						}) => ({
							id: playlist.id,
							name: playlist.name,
							length: playlist.tracks.total,
							img: playlist.images[2] || playlist.images[0],
						})
					);
			});
	},

	async getPlaylistTracks(playlist: IPlaylist) {
		const accessToken = SpotifyUtils.getAccessToken();
		const headers = { Authorization: `Bearer ${accessToken}` };
		let tracks: any[] = [];
		for (let i = 0; i < Math.ceil(playlist.length / 100); i++) {
			const newTracks = await fetch(
				`https://api.spotify.com/v1/playlists/${
					playlist.id
				}/tracks?offset=${i * 100}`,
				{
					headers: headers,
				}
			)
				.then((response) => response.json())
				.then((jsonResponse) => {
					return jsonResponse.items.map((track: any) => ({
						id: track.track.id,
						name: track.track.name,

						artist: track.track.artists
							.map((artist: any) => {
								return artist.name;
							})
							.join(", "),
						medImg: track.track.album.images[1],
						smImg: track.track.album.images[2],
						uri: track.uri,
					}));
				});

			tracks = tracks.concat(newTracks);
		}

		return tracks;
	},

	getRecommendations(picks: any, searchType: string) {
		const accessToken = SpotifyUtils.getAccessToken();
		const headers = { Authorization: `Bearer ${accessToken}` };
		const option =
			searchType === "Artists" ? "seed_artists=" : "seed_tracks=";

		let seedList = "";
		picks.forEach((pick: any) => {
			seedList = seedList.concat(pick.id, ",");
		});
		seedList = seedList.slice(0, seedList.length - 1);

		return fetch(
			`https://api.spotify.com/v1/recommendations?${option}${seedList}&limit=50`,
			{
				headers: headers,
			}
		)
			.then((response) => response.json())
			.then((jsonResponse) => {
				console.log(jsonResponse);
				return jsonResponse.tracks.map((track: any) => ({
					id: track.id,
					name: track.name,
					artist: track.artists
						.map((artist: any) => {
							return artist.name;
						})
						.join(", "),
					medImg: track.album.images[1],
					smImg: track.album.images[2],
					uri: track.uri,
				}));
			});
	},
};

export default SpotifyUtils;
