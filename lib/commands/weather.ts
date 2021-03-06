import fetch from 'node-fetch';
import { MessageEmbed } from 'discord.js';

const DIRECTIONS = [
	'north', 'north east',
	'east', 'south east',
	'south', 'south west',
	'west', 'north west'
];

const MOON_PHASES = ['🌑', '🌒️', '🌓', '🌔️', '🌕', '🌖️', '🌗', '🌘️'];

const ICONS = {
	'clear-day': '🌞',
	'clear-night': '🌚',
	'rain': '🌧️',
	'snow': '❄️',
	'sleet': '🌨️',
	'wind': '💨',
	'fog': '🌫️',
	'cloudy': '🌥️',
	'partly-cloudy-day': '⛅',
	'partly-cloudy-night': '⛅'
};

const WEATHER_URL = 'https://api.darksky.net/forecast';
const GEOCODE_URL = 'https://geocode-maps.yandex.ru/1.x/?format=json';

export default async (home_scope: HomeScope) => {
	const { message, args, SECRETS, CONFIG } = home_scope;

	if (args[0] === 'set' && args.length > 1) {
		CONFIG.weather_locations[message.author.id] = args.tail().join(' ');
		return message.answer(`Your weather location has \
			been set to ${args.tail().join(' ')}`.squeeze());
	}

	const location = args[0]
		? args.join(' ')
		: CONFIG.weather_locations[message.author.id] || 'Cuckfield';

	const key = SECRETS.darksky.key;
	const geokey = SECRETS.yandex.geocoder.key;

	const error = (e: Error) => {
		message.answer(`Error getting weather\n\`\`\`${e.message}\`\`\``);
		return e;
	};

	let geocoder_json, weather_info, geo_object;
	try {
		const geocoder = await fetch(`${GEOCODE_URL}&apikey=${geokey}`
			+`&geocode=${location}&lang=en-US`);

		geocoder_json = await geocoder.json();
		geo_object = geocoder_json.response
			.GeoObjectCollection
			.featureMember[0].GeoObject;

		const lat_lon = geo_object.Point.pos
			.split(' ').reverse();

		weather_info = await fetch(`${WEATHER_URL}/${key}/${lat_lon}`
			+`?exclude=minutely,hourly,alerts,flags&units=si`);
	} catch (e) {
		return error(e);
	}

	const d = await weather_info.json();
	const date = new Date(d.currently.time * 1000);
	const date_string = date.toLocaleTimeString('en-GB', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: d.timezone
	});

	let embed = new MessageEmbed()
		.setTitle(`Cannot get weather information from ${location}.`);

	if (d && d.currently) embed = new MessageEmbed()
		.setTitle(`${d.currently.temperature}°C`
			+ ` (feels like ${d.currently.apparentTemperature}°C)`)
		.setAuthor(`${ICONS[d.currently.icon]} ${date_string}`
			+` ${geo_object.name},`
			+` ${geo_object.description}`)
		.setDescription(
			MOON_PHASES[Math.round(d.daily.data[0].moonPhase * 7)]
			+ ' ' + d.currently.summary + '.')
		.addFields(
			{ name: 'daytime',
			  value: d.daily.data[0].temperatureHigh + '°C',
			  inline: true },
			{ name: 'nighttime',
			  value: d.daily.data[0].temperatureLow + '°C',
			  inline: true },
			{ name: 'humidity',
			  value: d.currently.humidity.toString().substring(2) + '%',
			  inline: true },
			{ name: 'wind',
			  value: `${DIRECTIONS[Math.round(d.currently.windBearing / 45) % 8]}`
				+ ` ${d.currently.windSpeed} ㎧`,
			  inline: true })
		.setFooter('Powered by Dark Sky',
			'https://darksky.net/images/darkskylogo.png');

	message.channel.send(embed);
};
