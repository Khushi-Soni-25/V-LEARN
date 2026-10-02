(function () {
  "use strict";

  var form = document.getElementById("otp-form");
  var otpInput = document.getElementById("otp");
  var verifyBtn = document.getElementById("verify-btn");
  var resendBtn = document.getElementById("resend-btn");
  var message = document.getElementById("form-message");
  var phoneHint = document.getElementById("phone-hint");
  var contextLink = document.getElementById("context-link");

  var VERIFY_ENDPOINT = "/api/otp/verify";
  var RESEND_ENDPOINT = "/api/otp/resend";
  var RESEND_COOLDOWN_SECONDS = 30;

  var phone = sessionStorage.getItem("vlearn_phone");
  var purpose = sessionStorage.getItem("vlearn_purpose");

  function setMessage(text, state) {
    message.textContent = text || "";
    if (state) {
      message.setAttribute("data-state", state);
    } else {
      message.removeAttribute("data-state");
    }
  }

  function maskPhone(value) {
    if (!value || value.length < 4) return value || "";
    return "•••• " + value.slice(-4);
  }

  if (!phone || !purpose) {
    setMessage(
      "We couldn't find a pending verification. Please start again.",
      "error"
    );
    form.querySelectorAll("input, button").forEach(function (el) {
      el.disabled = true;
    });
    contextLink.innerHTML =
      '<a href="../phone-login/phone-login.html">Enter your phone number</a>';
  } else {
    phoneHint.textContent = "Code sent to " + maskPhone(phone);
    contextLink.innerHTML =
      purpose === "reset"
        ? '<a href="../phone-login/phone-login.html?purpose=reset">Wrong number? Start over</a>'
        : '<a href="../vid-login/login.html">Use V-ID instead</a>';
  }

  var cooldownTimer = null;

  function startCooldown(seconds) {
    var remaining = seconds;
    resendBtn.disabled = true;
    resendBtn.textContent = "Resend OTP (" + remaining + "s)";
    clearInterval(cooldownTimer);
    cooldownTimer = setInterval(function () {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(cooldownTimer);
        resendBtn.disabled = false;
        resendBtn.textContent = "Resend OTP";
      } else {
        resendBtn.textContent = "Resend OTP (" + remaining + "s)";
      }
    }, 1000);
  }

  if (phone && purpose) {
    startCooldown(RESEND_COOLDOWN_SECONDS);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!phone || !purpose) return;
    setMessage("", null);

    var otp = otpInput.value.trim();

    if (!otp) {
      setMessage("Please enter the 6-digit code.", "error");
      return;
    }

    if (!/^[0-9]{6}$/.test(otp)) {
      setMessage("The code should be 6 digits.", "error");
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verifying…";

    fetch(VERIFY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone, otp: otp, purpose: purpose }),
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
          if (purpose === "reset") {
            sessionStorage.setItem("vlearn_reset_token", result.data.reset_token);
            setMessage("Phone verified. Redirecting…", "success");
            window.location.href = "../password-reset/reset-password.html";
          } else {
            sessionStorage.removeItem("vlearn_phone");
            sessionStorage.removeItem("vlearn_purpose");
            var name =
              result.data.user && result.data.user.name
                ? result.data.user.name
                : "";
            setMessage(
              name ? "Welcome back, " + name + "!" : "Login successful.",
              "success"
            );
            form.querySelectorAll("input, button").forEach(function (el) {
              el.disabled = true;
            });
            clearInterval(cooldownTimer);
          }
        } else if (result.status === 401) {
          setMessage(result.data.message || "Invalid or expired OTP.", "error");
        } else if (result.status === 400) {
          setMessage(result.data.message || "Please check the code and try again.", "error");
        } else {
          setMessage("Something went wrong. Please try again.", "error");
        }
      })
      .catch(function () {
        setMessage("Couldn't reach the server. Please check your connection.", "error");
      })
      .finally(function () {
        verifyBtn.disabled = false;
        verifyBtn.textContent = "Verify";
      });
  });

  resendBtn.addEventListener("click", function () {
    if (!phone || !purpose || resendBtn.disabled) return;
    setMessage("", null);
    resendBtn.disabled = true;

    fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone, purpose: purpose }),
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
          setMessage("A new code is on its way.", "success");
          startCooldown(RESEND_COOLDOWN_SECONDS);
        } else if (result.status === 429) {
          var wait = result.data.retry_after || RESEND_COOLDOWN_SECONDS;
          setMessage("Please wait before requesting another OTP.", "error");
          startCooldown(wait);
        } else {
          setMessage(result.data.message || "Couldn't resend the code.", "error");
          resendBtn.disabled = false;
        }
      })
      .catch(function () {
        setMessage("Couldn't reach the server. Please check your connection.", "error");
        resendBtn.disabled = false;
      });
  });
})();
