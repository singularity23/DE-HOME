from urllib.parse import urlencode, quote

params = {
    "device_type": "device Type",
    "device_id": "device ID",
    "settings_text": "settings",
    "engineer": "engineer",
    "email_address": "email",
    "phone_number": "phone",
    "date_issued": "_date",
}
path = r"https://hydroshare.bchydro.bc.ca/sites/de/SiteAssets/html/Fault%20Level%20Form.html"
query_string = urlencode(params, quote_via=quote)

link = f"{path}?{query_string}"
print(link)
