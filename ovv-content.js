chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.tyyppi === "hae_ovv") {
      const formData = new URLSearchParams();
      formData.append("action", "realty_filter");
      formData.append("city[]", request.city);
  
      fetch("https://www.ovv.com/wp-admin/admin-ajax.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          "Referer": "https://www.ovv.com/vuokrattavat-kohteet/"
        },
        body: formData.toString(),
        credentials: "include"
      })
        .then(res => res.json())
        .then(json => {
          sendResponse({ määrä: json.realties?.length ?? 0 });
        })
        .catch(err => {
          console.error("OVV fetch error:", err);
          sendResponse({ määrä: 0 });
        });
  
      return true;
    }
  });
  