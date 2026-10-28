-- =====================================================================
-- Chess Tournament Management & Player Performance Analytics
-- 01_schema.sql  |  MySQL 8.0.16+ (CHECK constraints are enforced)
-- Run order: 01_schema.sql -> 02_routines.sql -> 03_test.sql
-- =====================================================================

DROP DATABASE IF EXISTS chess_db;
CREATE DATABASE chess_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE chess_db;

-- ---------------------------------------------------------------------
-- PLAYER
-- ---------------------------------------------------------------------
CREATE TABLE player (
  player_id       INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(120) NOT NULL UNIQUE,
  country         VARCHAR(60),
  date_of_birth   DATE,
  current_rating  INT NOT NULL DEFAULT 1200,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_player_rating CHECK (current_rating BETWEEN 100 AND 3500)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TOURNAMENT
-- ---------------------------------------------------------------------
CREATE TABLE tournament (
  tournament_id INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  format        VARCHAR(12)  NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  status        VARCHAR(10)  NOT NULL DEFAULT 'UPCOMING',
  CONSTRAINT chk_t_format CHECK (format IN ('ROUND_ROBIN','KNOCKOUT','SWISS')),
  CONSTRAINT chk_t_status CHECK (status IN ('UPCOMING','ONGOING','COMPLETED')),
  CONSTRAINT chk_t_dates  CHECK (end_date >= start_date)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- REGISTRATION  (resolves Player M:N Tournament)
-- rating_at_entry is filled by a trigger, so it is nullable here.
-- ---------------------------------------------------------------------
CREATE TABLE registration (
  registration_id INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id   INT NOT NULL,
  player_id       INT NOT NULL,
  rating_at_entry INT,
  registered_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_registration UNIQUE (tournament_id, player_id),
  CONSTRAINT fk_reg_tournament FOREIGN KEY (tournament_id)
      REFERENCES tournament(tournament_id) ON DELETE CASCADE,
  CONSTRAINT fk_reg_player FOREIGN KEY (player_id)
      REFERENCES player(player_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TOURNAMENT_ROUND  (named this because ROUND is a MySQL function name)
-- ---------------------------------------------------------------------
CREATE TABLE tournament_round (
  round_id      INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT NOT NULL,
  round_no      INT NOT NULL,
  status        VARCHAR(12) NOT NULL DEFAULT 'SCHEDULED',
  CONSTRAINT chk_round_no     CHECK (round_no > 0),
  CONSTRAINT chk_round_status CHECK (status IN ('SCHEDULED','IN_PROGRESS','COMPLETED')),
  CONSTRAINT uq_round UNIQUE (tournament_id, round_no),
  CONSTRAINT fk_round_tournament FOREIGN KEY (tournament_id)
      REFERENCES tournament(tournament_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- GAME
-- ---------------------------------------------------------------------
CREATE TABLE game (
  game_id         INT AUTO_INCREMENT PRIMARY KEY,
  round_id        INT NOT NULL,
  board_no        INT NOT NULL,
  white_player_id INT NOT NULL,
  black_player_id INT NOT NULL,
  start_time      DATETIME,
  end_time        DATETIME,
  status          VARCHAR(12) NOT NULL DEFAULT 'SCHEDULED',
  CONSTRAINT chk_board      CHECK (board_no > 0),
  CONSTRAINT chk_game_status CHECK (status IN ('SCHEDULED','IN_PROGRESS','FINISHED')),
  CONSTRAINT chk_diff_players CHECK (white_player_id <> black_player_id),
  CONSTRAINT chk_game_times CHECK (end_time IS NULL OR start_time IS NULL OR end_time >= start_time),
  CONSTRAINT uq_board UNIQUE (round_id, board_no),
  CONSTRAINT fk_game_round FOREIGN KEY (round_id)
      REFERENCES tournament_round(round_id) ON DELETE CASCADE,
  CONSTRAINT fk_game_white FOREIGN KEY (white_player_id) REFERENCES player(player_id),
  CONSTRAINT fk_game_black FOREIGN KEY (black_player_id) REFERENCES player(player_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- RESULT  (1:1 with game)
-- ---------------------------------------------------------------------
CREATE TABLE result (
  game_id     INT PRIMARY KEY,
  outcome     VARCHAR(5) NOT NULL,
  is_upset    TINYINT(1) NOT NULL DEFAULT 0,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_outcome CHECK (outcome IN ('WHITE','BLACK','DRAW')),
  CONSTRAINT fk_result_game FOREIGN KEY (game_id)
      REFERENCES game(game_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- RATING_HISTORY  (two rows per game: one per player)
-- ---------------------------------------------------------------------
CREATE TABLE rating_history (
  history_id    INT AUTO_INCREMENT PRIMARY KEY,
  player_id     INT NOT NULL,
  game_id       INT NOT NULL,
  old_rating    INT NOT NULL,
  new_rating    INT NOT NULL,
  rating_change INT NOT NULL,
  recorded_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_rh UNIQUE (player_id, game_id),
  CONSTRAINT fk_rh_player FOREIGN KEY (player_id) REFERENCES player(player_id),
  CONSTRAINT fk_rh_game   FOREIGN KEY (game_id)   REFERENCES game(game_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TOURNAMENT_STANDINGS  (rank is reserved in MySQL 8, so column = rank_no)
-- ---------------------------------------------------------------------
CREATE TABLE tournament_standings (
  tournament_id INT NOT NULL,
  player_id     INT NOT NULL,
  played        INT NOT NULL DEFAULT 0,
  wins          INT NOT NULL DEFAULT 0,
  draws         INT NOT NULL DEFAULT 0,
  losses        INT NOT NULL DEFAULT 0,
  points        DECIMAL(4,1) NOT NULL DEFAULT 0,
  rank_no       INT,
  PRIMARY KEY (tournament_id, player_id),
  CONSTRAINT fk_st_tournament FOREIGN KEY (tournament_id)
      REFERENCES tournament(tournament_id) ON DELETE CASCADE,
  CONSTRAINT fk_st_player FOREIGN KEY (player_id) REFERENCES player(player_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- PREDICTION  (filled by the ML module)
-- ---------------------------------------------------------------------
CREATE TABLE prediction (
  prediction_id   INT AUTO_INCREMENT PRIMARY KEY,
  player_id       INT NOT NULL,
  tournament_id   INT,
  predicted_score DECIMAL(4,2) NOT NULL,
  model_version   VARCHAR(30),
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pred_player FOREIGN KEY (player_id) REFERENCES player(player_id),
  CONSTRAINT fk_pred_tournament FOREIGN KEY (tournament_id) REFERENCES tournament(tournament_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- ADMIN_USER
-- ---------------------------------------------------------------------
CREATE TABLE admin_user (
  admin_id      INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'ADMIN'
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- INDEXES (the UNIQUE constraints above already index their columns)
-- ---------------------------------------------------------------------
CREATE INDEX idx_player_name   ON player (name);
CREATE INDEX idx_player_rating ON player (current_rating);
CREATE INDEX idx_game_white    ON game (white_player_id);
CREATE INDEX idx_game_black    ON game (black_player_id);
CREATE INDEX idx_rh_player_time ON rating_history (player_id, recorded_at);
CREATE INDEX idx_reg_player    ON registration (player_id);
CREATE INDEX idx_pred_player   ON prediction (player_id);
