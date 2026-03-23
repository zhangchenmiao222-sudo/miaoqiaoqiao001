-- ============================================================
-- Migration 001: 初始化所有表
-- ============================================================

CREATE DATABASE IF NOT EXISTS smart_asset CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_asset;

-- ============================================================
-- 1. roles — 角色表（8种角色）
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  name          VARCHAR(50)  NOT NULL UNIQUE COMMENT '角色标识: lab_tester/warehouse/qc/kennel/admin_logistics/engineer/manager/trainee',
  label         VARCHAR(50)  NOT NULL COMMENT '角色中文名',
  permission_level ENUM('view','edit','manage') NOT NULL DEFAULT 'view' COMMENT '权限等级',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO roles (id, name, label, permission_level) VALUES
  (UUID(), 'lab_tester',      '实验室检测人员', 'edit'),
  (UUID(), 'warehouse',       '仓储/物料管理',  'edit'),
  (UUID(), 'qc',              '品控/质检',      'edit'),
  (UUID(), 'kennel',          '犬舍管理/饲养员','edit'),
  (UUID(), 'admin_logistics', '行政/后勤',      'edit'),
  (UUID(), 'engineer',        '工程/设备维护',  'edit'),
  (UUID(), 'manager',         '管理层/厂长',    'manage'),
  (UUID(), 'trainee',         '新员工（培训期）','view');

-- ============================================================
-- 2. users — 用户表（飞书账号）
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  lark_user_id  VARCHAR(100) NOT NULL UNIQUE COMMENT '飞书用户ID',
  name          VARCHAR(100) NOT NULL COMMENT '姓名',
  avatar_url    TEXT         COMMENT '头像URL',
  role_id       VARCHAR(36)  NOT NULL COMMENT '角色ID',
  department    VARCHAR(100) COMMENT '部门',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. categories — 分类表（6大一级分类，支持子分类）
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id            VARCHAR(36)   NOT NULL PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL COMMENT '分类名称',
  parent_id     VARCHAR(36)   DEFAULT NULL COMMENT 'NULL=一级分类',
  level         TINYINT       NOT NULL DEFAULT 1 COMMENT '层级: 1=一级, 2=二级',
  sort_order    INT           NOT NULL DEFAULT 0,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 预置6大一级分类（使用固定ID便于外键引用）
INSERT IGNORE INTO categories (id, name, parent_id, level, sort_order) VALUES
  ('cat-01', '原材料',   NULL, 1, 1),
  ('cat-02', '试剂耗材', NULL, 1, 2),
  ('cat-03', '设备工具', NULL, 1, 3),
  ('cat-04', '包装材料', NULL, 1, 4),
  ('cat-05', '办公用品', NULL, 1, 5),
  ('cat-06', '犬粮成品', NULL, 1, 6);

-- ============================================================
-- 4. locations — 位置表（区域 > 房间 > 具体位置，三级结构）
-- ============================================================
CREATE TABLE IF NOT EXISTS locations (
  id            VARCHAR(36)   NOT NULL PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL COMMENT '位置名称',
  parent_id     VARCHAR(36)   DEFAULT NULL COMMENT 'NULL=区域',
  level         TINYINT       NOT NULL DEFAULT 1 COMMENT '1=区域, 2=房间, 3=具体位置',
  description   VARCHAR(255)  COMMENT '位置描述',
  sort_order    INT           NOT NULL DEFAULT 0,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_locations_parent FOREIGN KEY (parent_id) REFERENCES locations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 5. items — 物品表（核心表）
-- ============================================================
CREATE TABLE IF NOT EXISTS items (
  id                  VARCHAR(36)   NOT NULL PRIMARY KEY,
  name                VARCHAR(200)  NOT NULL COMMENT '物品名称',
  aliases             JSON          COMMENT '别名数组 ["别名1","别名2"]',
  category_id         VARCHAR(36)   NOT NULL COMMENT '分类ID',
  location_id         VARCHAR(36)   COMMENT '位置ID（三级位置中的叶子节点）',
  status              ENUM('in_stock','in_use','transferred','expired','scrapped') NOT NULL DEFAULT 'in_stock',
  dog_id              VARCHAR(100)  COMMENT '关联犬只编号',
  expiry_date         DATE          COMMENT '有效期',
  photo_url           TEXT          COMMENT '照片URL',
  responsible_user_id VARCHAR(36)   COMMENT '负责人用户ID',
  notes               TEXT          COMMENT '备注',
  quantity            DECIMAL(10,2) NOT NULL DEFAULT 1 COMMENT '数量',
  unit                VARCHAR(20)   NOT NULL DEFAULT '个' COMMENT '单位',
  last_confirmed_at   DATETIME      COMMENT '最后确认时间',
  last_confirmed_by   VARCHAR(36)   COMMENT '最后确认人用户ID',
  created_by          VARCHAR(36)   COMMENT '创建人用户ID',
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_items_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_items_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
  FULLTEXT INDEX ft_items_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 6. item_aliases — 物品别名表（拼音/缩写/口语化）
-- ============================================================
CREATE TABLE IF NOT EXISTS item_aliases (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  item_id     VARCHAR(36)  NOT NULL COMMENT '物品ID',
  alias       VARCHAR(200) NOT NULL COMMENT '别名文本',
  alias_type  ENUM('pinyin','abbreviation','colloquial') NOT NULL DEFAULT 'colloquial',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_item_aliases_item (item_id),
  INDEX idx_item_aliases_alias (alias),
  CONSTRAINT fk_item_aliases_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 7. search_logs — 搜索日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS search_logs (
  id            VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id       VARCHAR(36)   COMMENT '搜索用户ID（可为空=匿名）',
  keyword       VARCHAR(500)  NOT NULL COMMENT '搜索关键词',
  result_count  INT           NOT NULL DEFAULT 0 COMMENT '结果数量',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_search_logs_user (user_id),
  INDEX idx_search_logs_keyword (keyword(100)),
  INDEX idx_search_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
