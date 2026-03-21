select trelay.s01 as Device,
      trequest.relaytype,
      trequest.M01
from trelay,
      trequest,
      tsettype1,
      tsetting1
where trelay.id = trequest.relayid
      and tsetting1.relaytype = tsettype1.relaytype
      and tsettype1.rownumber = tsetting1.rownumber
      and tsettype1.groupname = tsetting1.groupname
      and tsetting1.requestid = trequest.id
      and tsettype1.relaytype like 'AREVA%'
      and (trequest.s02 in ('In Service', 'Issued'))
order by trelay.s01,
      trequest.id,
      tsettype1.settingname