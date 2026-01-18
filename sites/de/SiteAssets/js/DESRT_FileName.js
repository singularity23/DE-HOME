(function () {
  let menu = document.getElementsByClassName('menu-details');
  console.log(menu);
  let content = menu[0].innerText;
  console.log(content);
  let list = content.split('\n');
  DESRT_NO = list[list.length - 1].split(':')[1];
  const address = list[1];
  Reasons = list[0];
  let arr_name = [DESRT_NO, address, Reasons];
  let filename = arr_name.join(' - ');
  document.addEventListener('click', (event) => {
    event.preventDefault;
    navigator.clipboard.writeText(filename);
    console.log(filename);
  });
})();
