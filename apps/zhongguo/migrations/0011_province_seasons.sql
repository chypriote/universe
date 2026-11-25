-- Seasons from Nico's old china.js trip list (bit 0 = January). Beijing and Shaanxi come from its search dates.
UPDATE provinces SET season = 1820 WHERE name IN ('Sichuan', 'Chongqing', 'Guangxi', 'Yunnan', 'Hunan', 'Hubei', 'Jiangxi', 'Shaanxi'); -- Mar-May, Sep-Nov
UPDATE provinces SET season = 1560 WHERE name IN ('Shanghai', 'Jiangsu', 'Zhejiang'); -- Apr-May, Oct-Nov
UPDATE provinces SET season = 1008 WHERE name = 'Xinjiang'; -- May-Oct
UPDATE provinces SET season = 824 WHERE name = 'Tibet'; -- Apr-Jun, Sep-Oct
UPDATE provinces SET season = 3084 WHERE name IN ('Guangdong', 'Fujian'); -- Mar-Apr, Nov-Dec
UPDATE provinces SET season = 1816 WHERE name = 'Beijing'; -- Apr-May, Sep-Nov
