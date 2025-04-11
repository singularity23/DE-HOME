document.getElementById('searchButton').addEventListener('click', () => {
  const E = document.getElementById('searchInput').value;
  const reg = /\\w{3}\\s((4)|(12)|(25)|(35))(F)\\d{2,3}\\w?/;

  if (reg.test(E)) {
    QueryProtection(E);
    document.getElementById('warning').innerHTML = '';
  } else {
    document.getElementById('warning').innerHTML =
      'Please use the correct format!';
    console.log('warning');
    document.getElementById('sql-editor').innerText = '';
    document.getElementById("QueryResultGrid").style.display = 'none';

  }
});

const QueryProtection = (E) => {
  let T = `ToBeReplaced`;
  document.getElementById('sql-editor').innerText = T;
  document.getElementById('sql-editor-section')?.style.display !== 'none' &&
    runQuery();
  console.log('Run Query');
  setTimeout(() => {
    console.log('Wait for 6s'), N();
  }, 6e3);
  const S = (E) => {
    let T = '';
    const S = { G: 'GND ', P: 'PHS ', Q: 'NEG ', N: 'GND ' },
      N = E.charAt(2);
    T += S[N] || 'PHS ';
    if (/^50P[234]/.test(E)) {
      T = 'Definite Time Pick Up (A)';
    } else if (/^67P[234]/.test(E)) {
      T = 'Definite Time Delay (s)';
    } else {
      ;/^50/.test(E)
        ? (T += 'Inst. Overcurrent ')
        : /^51/.test(E) && (T += 'Timed Overcurrent ');
      const S = {
          P: 'Pick Up (A)',
          C: 'Curve',
          TD: 'Time Dial',
          TC: 'Torque Control',
          L: 'Low Set',
          H: 'High Set',
        },
        N = E.slice(-1),
        R = E.slice(-2);
      S[R] ? (T += S[R]) : S[N] && (T += S[N]);
    }
    return (
      /^50[PG]5/.test(E) && (T += ' (Live Line)'),
      /^SV\\d?\\w+/.test(E) && (T = '_Trip Equation'),
      T
    );
  };
  const N = () => {
    console.log('Start');
    const E = Array.from(_C1MVCCtrl5._ncc),
      L = E.length;
    if (L > 10) {
      for (let X = 0; X < L; X++) E[X][4] = S(E[X][2]);
    } else {
      document.body.style.fontFamily = 'monospace';
    }
    alert('Query Completed');
  };
}
