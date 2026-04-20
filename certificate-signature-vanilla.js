var mgr;

document.addEventListener('DOMContentLoaded', function () {
  mgr = new CertifioManager("en");

  mgr.getCertificates(
    function (certs) {
      document.getElementById('installationStatusNotRunning').style.display = 'none';
      document.getElementById('installationStatusRunning').style.display = 'block';
      document.getElementById('pInstallationTest').classList.add('panel-success');
    },
    function (err) {
      document.getElementById('pInstallationTest').classList.add('panel-danger');
      console.error("Error occured in getCertificates", err);
    }
  );
});

function listCertificates () {
  mgr.getCertificates(
    function (certs) {
      const certificatesSelect = document.getElementById('certificates');

      certs.forEach(function (cert) {
        const option = document.createElement('option');
        option.value = cert.deviceId;
        option.textContent = cert.cn + (cert.org ? " (" + cert.org + ")" : "");
        certificatesSelect.appendChild(option);
      });

      document.getElementById('listStatusNotDone').style.display = 'none';
      document.getElementById('listStatusSuccess').style.display = 'block';
      document.getElementById('pListTest').classList.add('panel-success');
    },
    function (resp) {
      console.error(resp);
      document.getElementById('listStatusNotDone').style.display = 'none';
      document.getElementById('listStatusFailure').style.display = 'block';
      document.getElementById('pListTest').classList.add('panel-danger');
    }
  );
}

function sign () {
  console.log(document.documentElement.outerHTML);

  const req = {
    deviceId: document.getElementById('certificates').value,
    type: "ENVELOPED",
    data: document.documentElement.outerHTML
  };

  mgr.sign(
    req,
    function (data) {
      document.getElementById('signStatusNotDone').style.display = 'none';
      document.getElementById('signStatusSuccess').style.display = 'block';
      document.getElementById('pSignatureTest').classList.add('panel-success');
      console.log(data);
    },
    function (resp) {
      console.error(resp);
      document.getElementById('signStatusNotDone').style.display = 'none';
      document.getElementById('signStatusFailure').style.display = 'block';
      document.getElementById('pSignatureTest').classList.add('panel-danger');
    }
  );
}
