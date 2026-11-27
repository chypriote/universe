-- Local dev only: fake labels whose word equals the code name. The real words live in the private
-- remote D1, never in this repository.
INSERT OR REPLACE INTO labels (code_name, word) VALUES
	('Aviary', 'Aviary'),
	('Aloft', 'Aloft'),
	('Grounded', 'Grounded'),
	('Nest', 'Nest'),
	('Seen', 'Seen'),
	('Flown', 'Flown'),
	('Lost', 'Lost'),
	('NoBirds', 'NoBirds'),
	('Signature', 'Signature');
