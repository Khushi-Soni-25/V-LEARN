(function () {
  "use strict";

  var form = document.getElementById("phone-form");
  var phoneInput = document.getElementById("phone");
  var submitBtn = document.getElementById("request-otp-btn");
  var message = document.getElementById("form-message");
  var heading = document.getElementById("phone-heading");
  var subtext = document.querySelector(".entry__subtext");

  var LOGIN_OTP_ENDPOINT = "/api/login/phone/request-otp";
  var RESET_OTP_ENDPOINT = "/api/password-reset/request-otp";

  // Set by login.html's "Forgot password?" link; defaults to a normal
  // phone login when not present.
  var queryPurpose = new URLSearchParams(window.location.search).get("purpose");
  if (queryPurpose === "reset" || queryPurpose === "login") {
    sessionStorage.setItem("vlearn_purpose", queryPurpose);
  }
  var PURPOSE = sessionStorage.getItem("vlearn_purpose") === "reset" ? "reset" : "login";
  var REQUEST_OTP_ENDPOINT = PURPOSE === "reset" ? RESET_OTP_ENDPOINT : LOGIN_OTP_ENDPOINT;

  if (PURPOSE === "reset") {
    heading.textContent = "Reset your password";
    subtext.textContent = "Enter your mobile number to receive a verification code.";
    submitBtn.textContent = "Send code";
  }

  function setMessage(text, state) {
    message.textContent = text || "";
    if (state) {
      message.setAttribute("data-state", state);
    } else {
      message.removeAttribute("data-state");
    }
  }

  function isPlausiblePhone(value) {
    return /^\+?[0-9]{7,15}$/.test(value.trim());
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    setMessage("", null);

    var phone = phoneInput.value.trim();

    if (!phone) {
      setMessage("Please enter your mobile number.", "error");
      return;
    }

    if (!isPlausiblePhone(phone)) {
      setMessage("Enter a valid phone number (digits only, 7-15 characters).", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    fetch(REQUEST_OTP_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone }),
    })
      .then(function (response) {
        return response
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            return { ok: response.ok, status: response.status, data: data };
          });
      })
      .then(function (result) {
        if (result.ok && result.data.status === "success") {
          sessionStorage.setItem("vlearn_phone", phone);
          sessionStorage.setItem("vlearn_purpose", PURPOSE);
          setMessage("OTP sent. Redirecting…", "success");
          window.location.href = "../otp-verification/otp-verification.html";
        } else if (result.status === 429) {
          var wait = result.data.retry_after
            ? " Please wait " + result.data.retry_after + "s."
            : "";
          setMessage(
            (result.data.message || "Please wait before requesting another OTP.") + wait,
            "error"
          );
        } else if (result.status === 400) {
          setMessage(result.data.message || "Please check your phone number.", "error");
        } else {
          setMessage("Something went wrong. Please try again.", "error");
        }
      })
      .catch(function () {
        setMessage("Couldn't reach the server. Please check your connection.", "error");
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = PURPOSE === "reset" ? "Send code" : "Send OTP";
      });
  });
})();
