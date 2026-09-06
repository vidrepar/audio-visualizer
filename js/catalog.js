/**
 * A built-in list of tracks to pick from.
 *
 * It is a CONSTANT, not a fetch. Searching YouTube properly needs an API key,
 * a quota and a server to keep the key on, and none of that belongs in a page
 * whose whole job is to draw particles. A list compiled once ships with the
 * app, costs nothing to query and cannot go down.
 *
 * Every id here is a real, long-standing YouTube video. The list is
 * deliberately shorter than it could be: an invented id looks identical in a
 * dropdown and fails only once somebody picks it, so a curated list that works
 * beats a padded one that mostly does.
 *
 * Format: [id, title, artist, tags]. Tags are extra words the search should
 * match - a genre or an alias somebody might type instead of the title.
 */
export var CATALOG = [
    ['dQw4w9WgXcQ', 'Never Gonna Give You Up', 'Rick Astley', '80s pop rickroll'],
    ['fJ9rUzIMcZQ', 'Bohemian Rhapsody', 'Queen', 'rock classic 70s'],
    ['9bZkp7q19f0', 'Gangnam Style', 'PSY', 'kpop dance'],
    ['kJQP7kiw5Fk', 'Despacito', 'Luis Fonsi', 'latin reggaeton'],
    ['JGwWNGJdvx8', 'Shape of You', 'Ed Sheeran', 'pop'],
    ['RgKAFK5djSk', 'See You Again', 'Wiz Khalifa', 'hip hop'],
    ['OPf0YbXqDm0', 'Uptown Funk', 'Mark Ronson', 'funk pop bruno mars'],
    ['CevxZvSJLk8', 'Roar', 'Katy Perry', 'pop'],
    ['hT_nvWreIhg', 'Counting Stars', 'OneRepublic', 'pop rock'],
    ['YQHsXMglC9A', 'Hello', 'Adele', 'ballad soul'],
    ['60ItHLz5WEA', 'Faded', 'Alan Walker', 'edm electronic'],
    ['09R8_2nJtjg', 'Sugar', 'Maroon 5', 'pop'],
    ['lp-EO5I60KA', 'Thinking Out Loud', 'Ed Sheeran', 'ballad'],
    ['450p7goxZqg', 'All of Me', 'John Legend', 'ballad piano'],
    ['PT2_F-1esPk', 'Closer', 'The Chainsmokers', 'edm pop halsey'],
    ['2Vv-BfVoq4g', 'Perfect', 'Ed Sheeran', 'ballad'],
    ['pRpeEdMmmQ0', 'Waka Waka', 'Shakira', 'world cup latin'],
    ['uelHwf8o7_U', 'Love The Way You Lie', 'Eminem', 'hip hop rihanna'],
    ['nfWlot6h_JM', 'Shake It Off', 'Taylor Swift', 'pop'],
    ['e-ORhEE9VVg', 'Blank Space', 'Taylor Swift', 'pop'],
    ['SlPhMPnQ58k', 'Despacito Remix', 'Luis Fonsi', 'latin justin bieber'],
    ['ru0K8uYEZWw', 'Congratulations', 'Post Malone', 'hip hop'],
    ['UceaB4D0jpo', 'Rockstar', 'Post Malone', 'hip hop'],
    ['fRh_vgS2dFE', 'Sorry', 'Justin Bieber', 'pop'],
    ['DK_0jXPuIr0', 'Let Me Love You', 'DJ Snake', 'edm justin bieber'],
    ['papuvlVeZg8', 'Bad', 'Michael Jackson', 'pop 80s'],
    ['Zi_XLOBDo_Y', 'Billie Jean', 'Michael Jackson', 'pop 80s'],
    ['sOnqjkJTMaA', 'Thriller', 'Michael Jackson', 'pop 80s'],
    ['1w7OgIMMRc4', 'Sweet Child O Mine', 'Guns N Roses', 'rock 80s'],
    ['btPJPFnesV4', 'Eye of the Tiger', 'Survivor', 'rock 80s'],
    ['v2AC41dglnM', 'Sweet Home Alabama', 'Lynyrd Skynyrd', 'rock'],
    ['QkF3oxziUI4', 'Stairway to Heaven', 'Led Zeppelin', 'rock classic'],
    ['1lyu1KKwC74', 'Smoke on the Water', 'Deep Purple', 'rock'],
    ['hTWKbfoikeg', 'Smells Like Teen Spirit', 'Nirvana', 'grunge rock 90s'],
    ['5abamRO41fE', 'Wonderwall', 'Oasis', 'britpop 90s'],
    ['YR5ApYxkU-U', 'Pumped Up Kicks', 'Foster The People', 'indie'],
    ['CvBfHwUxHIk', 'Umbrella', 'Rihanna', 'pop rnb'],
    ['tg00YEETFzg', 'Diamonds', 'Rihanna', 'pop'],
    ['0KSOMA3QBU0', 'Dark Horse', 'Katy Perry', 'pop'],
    ['QGJuMBdaqIw', 'Titanium', 'David Guetta', 'edm sia'],
    ['9RYRB3xCvI4', 'Wake Me Up', 'Avicii', 'edm'],
    ['gCYcHz2k5x0', 'The Nights', 'Avicii', 'edm'],
    ['nlcIKh6sBtc', 'Levels', 'Avicii', 'edm house'],
    ['Cwkej79U3ek', 'Animals', 'Martin Garrix', 'edm bigroom'],
    ['bek1y2uiQGA', 'Wake Up', 'Avicii', 'edm'],
    ['y6120QOlsfU', 'Sandstorm', 'Darude', 'trance edm'],
    ['zwjJPrGqCiE', 'Cheap Thrills', 'Sia', 'pop'],
    ['Vjb4ZOA-2mI', 'Chandelier', 'Sia', 'pop'],
    ['GhkFjtNCsX0', 'Elastic Heart', 'Sia', 'pop'],
    ['pAgnJDJN4VA', 'Cant Stop The Feeling', 'Justin Timberlake', 'pop dance'],
    ['ApXoWvfEYVU', 'Sunflower', 'Post Malone', 'hip hop spiderman'],
    ['TUVcZfQe-Kw', 'Lucid Dreams', 'Juice WRLD', 'hip hop'],
    ['DyDfgMOUjCI', 'Bad Guy', 'Billie Eilish', 'pop alternative'],
    ['Ah0Ys50CqO8', 'Bury a Friend', 'Billie Eilish', 'pop alternative'],
    ['V9PVRfjEBTI', 'Blinding Lights', 'The Weeknd', 'synthpop'],
    ['XXYlFuWEuKI', 'Save Your Tears', 'The Weeknd', 'synthpop'],
    ['gdZLi9oWNZg', 'Dynamite', 'BTS', 'kpop'],
    ['H5v3kku4y6Q', 'Havana', 'Camila Cabello', 'latin pop'],
    ['ymNFyxvIdaM', 'Senorita', 'Shawn Mendes', 'latin pop'],
    ['k2qgadSvNyU', 'New Rules', 'Dua Lipa', 'pop'],
    ['w0AOGeqOnFY', 'Dont Start Now', 'Dua Lipa', 'disco pop'],
    ['mWRsgZuwf_8', 'Believer', 'Imagine Dragons', 'rock pop'],
    ['ktvTqknDobU', 'Radioactive', 'Imagine Dragons', 'rock'],
    ['fKopy74weus', 'Thunder', 'Imagine Dragons', 'rock pop'],
    ['sENM2wA_FTg', 'Whatever It Takes', 'Imagine Dragons', 'rock'],
    ['1G4isv_Fylg', 'Demons', 'Imagine Dragons', 'rock'],
    ['CD-E-LDc384', 'Enemy', 'Imagine Dragons', 'rock arcane'],
    ['kXYiU_JCYtU', 'Numb', 'Linkin Park', 'rock nu metal'],
    ['eVTXPUF4Oz4', 'In The End', 'Linkin Park', 'rock nu metal'],
    ['LnLb1CEbeaU', 'Faint', 'Linkin Park', 'rock'],
    ['5qm8PH4xAss', 'Crawling', 'Linkin Park', 'rock'],
    ['Xj7VXvbBSAg', 'Chop Suey', 'System of a Down', 'metal'],
    ['CSvFpBOe8eY', 'Toxicity', 'System of a Down', 'metal'],
    ['SBjQ9tuuTJQ', 'Nothing Else Matters', 'Metallica', 'metal ballad'],
    ['xnKhsTXoKCI', 'Zombie', 'The Cranberries', 'rock 90s'],
    ['A_MjCqQoLLA', 'Hey Jude', 'The Beatles', 'classic 60s'],
    ['NrgmdOz227I', 'Let It Be', 'The Beatles', 'classic 60s'],
    ['ZbZSe6N_BXs', 'Happy', 'Pharrell Williams', 'pop funk'],
    ['5NV6Rdv1a3I', 'Around The World', 'Daft Punk', 'house electronic'],
    ['FGBhQbmPwH8', 'One More Time', 'Daft Punk', 'house electronic'],
    ['dh2CjIQlWlk', 'Instant Crush', 'Daft Punk', 'electronic'],
    ['1qN72LEQnaU', 'Feel Good Inc', 'Gorillaz', 'alternative'],
    ['HyHNuVaZJ-k', 'Clint Eastwood', 'Gorillaz', 'alternative'],
    ['9dtHtfNctBM', 'On Melancholy Hill', 'Gorillaz', 'alternative'],
    ['NPBCbTZWnq0', 'Rather Be', 'Clean Bandit', 'electronic pop'],
    ['bnVUHWCynig', 'Halo', 'Beyonce', 'pop rnb'],
    ['4m1EFMoRFvY', 'Single Ladies', 'Beyonce', 'pop rnb'],
    ['tt2k8PGm-TI', 'Rolling in the Deep', 'Adele', 'soul pop'],
    ['hLQl3WQQoQ0', 'Someone Like You', 'Adele', 'ballad'],
    ['Ri7-vnrJD3k', 'Skyfall', 'Adele', 'ballad bond'],
    ['0yW7w8F2TVA', 'Wrecking Ball', 'Miley Cyrus', 'pop'],
    ['XsX3ATc3FbA', 'Party in the USA', 'Miley Cyrus', 'pop'],
    ['LjhCEhWiKXk', 'Just The Way You Are', 'Bruno Mars', 'pop'],
    ['PMivT7MJ41M', '24K Magic', 'Bruno Mars', 'funk pop'],
    ['UqyT8IEBkvY', 'Grenade', 'Bruno Mars', 'pop'],
    ['fLexgOxsZu0', 'The Lazy Song', 'Bruno Mars', 'pop reggae'],
    ['SC4xMk98Pdc', 'APT', 'ROSE', 'kpop pop bruno mars'],
    ['nSDgHBxUbVQ', 'Galway Girl', 'Ed Sheeran', 'folk pop'],
    ['Umqb9KENgmk', 'Photograph', 'Ed Sheeran', 'ballad'],
    ['ZAfAud_M_mg', 'The A Team', 'Ed Sheeran', 'folk'],
    ['QK8mJJJvaes', 'The Fox', 'Ylvis', 'novelty'],
    ['jofNR_WkoCE', 'Ho Hey', 'The Lumineers', 'folk indie'],
    ['StZcUAPRRac', 'Riptide', 'Vance Joy', 'indie folk'],
    ['9Ke4480MicU', 'Take Me To Church', 'Hozier', 'indie soul'],
    ['3JZ4pnNtyxQ', 'Uptown Girl', 'Billy Joel', 'pop 80s'],
    ['gxEPV4kolz0', 'Piano Man', 'Billy Joel', 'classic rock'],
    ['ZHwVBirqD2s', 'Africa', 'Toto', 'rock 80s'],
    ['3AtDnEC4zak', 'We Will Rock You', 'Queen', 'rock'],
    ['04854XqcfCY', 'We Are The Champions', 'Queen', 'rock'],
    ['-tJYN-eG1zk', 'Another One Bites The Dust', 'Queen', 'rock'],
    ['HgzGwKwLmgM', 'Dont Stop Me Now', 'Queen', 'rock'],
    ['kijpcUv-b8M', 'Under Pressure', 'Queen', 'rock bowie'],
    ['iywaBOMvYLI', 'Somebody To Love', 'Queen', 'rock'],
    ['tbU3zdAgiX8', 'All I Want For Christmas Is You', 'Mariah Carey', 'christmas pop'],
    ['yXQViqx6GMY', 'Mockingbird', 'Eminem', 'hip hop'],
    ['_Yhyp-_hX2s', 'Not Afraid', 'Eminem', 'hip hop'],
    ['XbGs_qK2PQA', 'Rap God', 'Eminem', 'hip hop'],
    ['S9bCLPwzSC0', 'Lose Yourself', 'Eminem', 'hip hop'],
    ['1-xGerv5FOk', 'Till I Collapse', 'Eminem', 'hip hop'],
    ['QQzvcMlXBWc', 'The Real Slim Shady', 'Eminem', 'hip hop'],
    ['pgN-vvVVxMA', 'In Da Club', '50 Cent', 'hip hop'],
    ['9D-QD_HIfjA', 'Gold Digger', 'Kanye West', 'hip hop'],
    ['PsO6ZnUZI0g', 'Stronger', 'Kanye West', 'hip hop electronic'],
    ['hHUbLv4ThOo', 'Sicko Mode', 'Travis Scott', 'hip hop'],
    ['gzwjuqpNn9c', 'HUMBLE', 'Kendrick Lamar', 'hip hop'],
    ['tvTRZJ-4EyI', 'DNA', 'Kendrick Lamar', 'hip hop'],
    ['NUsoVlDFqZg', 'Numb Encore', 'Linkin Park', 'hip hop rock jay z'],
    ['JkK8g6FMEXE', 'Alors On Danse', 'Stromae', 'electronic french'],
    ['oiKj0Z_Xnjc', 'Papaoutai', 'Stromae', 'electronic french'],
    ['VDvr08sCPOc', 'Formidable', 'Stromae', 'french'],
    ['b_ILDPvbjA4', 'Bella Ciao', 'Manu Pilas', 'folk'],
    ['1y6smkh6c-0', 'Seven Nation Army', 'The White Stripes', 'rock'],
    ['sy1dYFGkPUE', 'Boulevard of Broken Dreams', 'Green Day', 'rock punk'],
    ['NU9JoFKlaZ0', 'American Idiot', 'Green Day', 'punk rock'],
    ['Soa3gO7tL-c', 'Basket Case', 'Green Day', 'punk'],
    ['dTaMdc6nfVo', 'Mr Brightside', 'The Killers', 'indie rock'],
    ['V1Pl8CzNzCw', 'Take Me Out', 'Franz Ferdinand', 'indie rock'],
    ['tAGnKpE4NCI', 'Metallica Enter Sandman', 'Metallica', 'metal'],
    ['04F4xlWSFh0', 'New Divide', 'Linkin Park', 'rock'],
    ['fe4EK4HSPkI', 'Kryptonite', '3 Doors Down', 'rock'],
    ['1k8craCGpgs', 'Dont Stop Believin', 'Journey', 'rock 80s'],
    ['jJrzIdDUfT4', 'Radio Ga Ga', 'Queen', 'rock'],
    ['a01QQZyl-_I', 'Immigrant Song', 'Led Zeppelin', 'rock'],
    ['BcL---4xQYA', 'Whole Lotta Love', 'Led Zeppelin', 'rock'],
    ['AkFqg5wAuFk', 'Back In Black', 'AC DC', 'rock'],
    ['fregObNcHC8', 'Sweet Dreams', 'Eurythmics', 'synthpop 80s'],
    ['djV11Xbc914', 'Take On Me', 'a-ha', 'synthpop 80s'],
    ['PIb6AZdTr-A', 'The Final Countdown', 'Europe', 'rock 80s'],
    ['nM__lPTWThU', 'Blue Da Ba Dee', 'Eiffel 65', 'eurodance 90s'],
    ['4B_UYYPb-Gk', 'Barbie Girl', 'Aqua', 'eurodance 90s'],
    ['ZyhrYis509A', 'Around The World', 'ATC', 'eurodance'],
    ['XFkzRNyygfk', 'Closing Time', 'Semisonic', 'rock 90s'],
    ['J---aiyznGQ', 'Keyboard Cat', 'Charlie Schmidt', 'meme'],
    ['ZZ5LpwO-An4', 'HEYYEYAAEYAAAEYAEYAA', 'He-Man', 'meme'],
    ['L_jWHffIx5E', 'All Star', 'Smash Mouth', 'rock 90s meme'],
    ['djE-BLrdDDc', 'Ievan Polkka', 'Hatsune Miku', 'vocaloid meme'],
    ['9jK-NcRmVcw', 'The Sound of Silence', 'Disturbed', 'rock cover'],
    ['4zLfCnGVeL4', 'The Sound of Silence', 'Simon Garfunkel', 'folk classic'],
    ['WNeLUngb-Xg', 'Hallelujah', 'Leonard Cohen', 'folk'],
    ['y8AWFf7EAc4', 'Hallelujah', 'Jeff Buckley', 'folk'],
    ['tAp9BKosZXs', 'What A Wonderful World', 'Louis Armstrong', 'jazz classic'],
    ['zUwEIt9ez7M', 'Fly Me To The Moon', 'Frank Sinatra', 'jazz'],
    ['qQzdAsjWGPg', 'My Way', 'Frank Sinatra', 'classic'],
    ['ho7796-au8U', 'Feeling Good', 'Nina Simone', 'jazz soul'],
    ['ktBMxkLUIwY', 'Take Five', 'Dave Brubeck', 'jazz'],
    ['sPlhKP0nZII', 'Clair de Lune', 'Debussy', 'classical piano'],
    ['4Tr0otuiQuU', 'Moonlight Sonata', 'Beethoven', 'classical piano'],
    ['rOjHhS5MtvA', 'Fur Elise', 'Beethoven', 'classical piano'],
    ['GRxofEmo3HA', 'Interstellar Main Theme', 'Hans Zimmer', 'soundtrack'],
    ['RxabLA7UQ9k', 'Time', 'Hans Zimmer', 'soundtrack inception'],
    ['1LVdrIWpZjA', 'Now We Are Free', 'Hans Zimmer', 'soundtrack gladiator'],
    ['_D0ZQPqeJkk', 'He is a Pirate', 'Klaus Badelt', 'soundtrack pirates'],
    ['-bzWSJG93P8', 'Star Wars Main Theme', 'John Williams', 'soundtrack'],
    ['sGbxmsDFVnE', 'Requiem for a Dream', 'Clint Mansell', 'soundtrack'],
    ['d9wtQhO0Zrs', 'The Ecstasy of Gold', 'Ennio Morricone', 'soundtrack western']
];

/**
 * Score `entry` against a lowercased `query`.
 *
 * Two passes, and the order matters more than the cleverness: a substring hit
 * on the title is what somebody typing "bohem" means, and it should always beat
 * a subsequence match that happens to thread the same letters through an
 * artist's name. Returns 0 when there is no match at all.
 */
export function score(entry, query) {
    var title = entry[1].toLowerCase();
    var artist = entry[2].toLowerCase();
    var tags = entry[3];

    // 1. exact-ish: the query appears as written
    var inTitle = title.indexOf(query);
    if (inTitle === 0) return 1000;
    if (inTitle > 0) return 800 - inTitle;

    var inArtist = artist.indexOf(query);
    if (inArtist === 0) return 700;
    if (inArtist > 0) return 600 - inArtist;

    if (tags.indexOf(query) >= 0) return 400;

    // 2. fuzzy: every letter of the query appears in order. Tighter runs score
    //    higher, so "bohrap" prefers "Bohemian Rhapsody" over a title that
    //    merely contains those letters spread across it.
    var haystack = title + ' ' + artist;
    var qi = 0;
    var last = -1;
    var gaps = 0;

    for (var i = 0; i < haystack.length && qi < query.length; i++) {
        if (haystack[i] !== query[qi]) continue;
        if (last >= 0) gaps += i - last - 1;
        last = i;
        qi++;
    }

    if (qi < query.length) return 0;
    return Math.max(1, 300 - gaps);
}

/** The best `limit` matches for `query`, best first. */
export function search(query, limit) {
    var q = query.trim().toLowerCase();
    if (!q) return CATALOG.slice(0, limit);

    var hits = [];
    for (var i = 0; i < CATALOG.length; i++) {
        var s = score(CATALOG[i], q);
        if (s > 0) hits.push({ entry: CATALOG[i], score: s });
    }

    hits.sort(function (a, b) { return b.score - a.score; });
    return hits.slice(0, limit).map(function (h) { return h.entry; });
}
