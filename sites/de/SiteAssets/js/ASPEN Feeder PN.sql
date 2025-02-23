SELECT
  R.S01 AS DEVICE,
  Q.RELAYTYPE AS RELAY,
  T.SETTINGNAME AS ELEMENT,
  CASE
    WHEN T.SETTINGNAME NOT LIKE '%C'
    AND T.SETTINGNAME NOT LIKE '%D'
    AND S.GROUPNAME = '1'
    AND DBMS_LOB.SUBSTR (S.SETTING, 4000) <> 'OFF' THEN UPPER(
      TO_NUMBER (DBMS_LOB.SUBSTR (S.SETTING, 4000)) * (
        SELECT
          TO_NUMBER (DBMS_LOB.SUBSTR (S.SETTING, 4000)) AS CTR
        FROM
          TSETTING1 S,
          TSETTYPE1 T,
          TRELAY R,
          TREQUEST Q
        WHERE
          R.S01 LIKE '\${E}%'
          AND R.RELAYTYPE LIKE 'SEL%'
          AND R.ID = Q.RELAYID
          AND Q.ID = S.REQUESTID
          AND T.RELAYTYPE = Q.RELAYTYPE
          AND T.ROWNUMBER = S.ROWNUMBER
          AND S.GROUPNAME = '1'
          AND T.SETTINGNAME = 'CTR'
          AND UPPER(Q.S02) = 'IN SERVICE'
      )
    )
    WHEN T.SETTINGNAME LIKE '67%D'
    AND S.GROUPNAME = '1'
    AND DBMS_LOB.SUBSTR (S.SETTING, 4000) <> 'OFF' THEN UPPER(
      TO_NUMBER (DBMS_LOB.SUBSTR (S.SETTING, 4000)) / 60
    )
    ELSE DBMS_LOB.SUBSTR (S.SETTING, 4000)
  END AS SETTING,
  Q.M01 AS MEMO
FROM
  TSETTING1 S,
  TSETTYPE1 T,
  TRELAY R,
  TREQUEST Q
WHERE
  R.S01 LIKE '\${E}%'
  AND R.RELAYTYPE LIKE 'SEL%'
  AND R.ID = Q.RELAYID
  AND Q.ID = S.REQUESTID
  AND T.RELAYTYPE = Q.RELAYTYPE
  AND T.ROWNUMBER = S.ROWNUMBER
  AND UPPER(Q.S02) = 'IN SERVICE'
  AND (
    (
      S.GROUPNAME = '1'
      AND T.SETTINGNAME IN (
        '51P1P',
        '51P1TD',
        '51P1C',
        '50P1P',
        '50P2P',
        '50P3P',
        '50P4P',
        '50P5P',
        '67P2D',
        '67P3D',
        '67P4D',
        '51G1P',
        '51G1TD',
        '51G1C',
        '50G1P',
        '50G5P',
        '51PP',
        '51PTD',
        '51PC',
        '51GP',
        '51GTD',
        '51GC',
        '51P',
        '51TD',
        '51C',
        '50L',
        '50H',
        '51NP',
        '51NTD',
        '51NC',
        '50NL',
        '50NH',
        '51QP',
        '51QTD',
        '51QC',
        '50Q'
      )
    )
    OR (
      S.GROUPNAME LIKE "*"
      AND (
        (
          T.SETTINGNAME LIKE (
            SELECT
              S.SETTING AS TR
            FROM
              TSETTING1 S,
              TSETTYPE1 T,
              TRELAY R,
              TREQUEST Q
            WHERE
              R.S01 LIKE '\${E}%'
              AND R.RELAYTYPE LIKE 'SEL%'
              AND R.ID = Q.RELAYID
              AND Q.ID = S.REQUESTID
              AND T.RELAYTYPE = Q.RELAYTYPE
              AND T.ROWNUMBER = S.ROWNUMBER
              AND S.GROUPNAME = 'L1'
              AND T.SETTINGNAME LIKE 'TR*'
              AND UPPER(Q.S02) = 'IN SERVICE'
          )
        )
        OR T.SETTINGNAME IN ('51P1TC', '51PTC')
      )
    )
  )
UNION ALL
SELECT
  R.S01 AS DEVICE,
  R.S04 AS RELAY,
  R.S06 AS VENDER,
  Q.RELAYTYPE,
  Q.M01 AS MEMO
FROM
  TRELAY R,
  TREQUEST Q
WHERE
  R.S01 LIKE '\${E}%'
  AND UPPER(R.RELAYTYPE) LIKE 'ELECTRO%'
  AND R.ID = Q.RELAYID
  AND UPPER(Q.S02) = 'IN SERVICE'
