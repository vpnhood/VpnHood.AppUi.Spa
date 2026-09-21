<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import { ref } from 'vue';
import { AppOsType, AppUserReview } from '@/services/VpnHood.Client.Api';
import { Util } from '@/helpers/Util';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const props = defineProps<{
  modelValue: boolean
}>();

const selectedRate = ref(0);
const showReviewTextarea = ref(false);
const showReviewThanks = ref(false);
const userReviewText = ref<string|null>(null);

const rates = [
  { value: 1, icon: '<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M4.285 12.433a.5.5 0 0 0 .683-.183A3.5 3.5 0 0 1 8 10.5c1.295 0 2.426.703 3.032 1.75a.5.5 0 0 0 .866-.5A4.5 4.5 0 0 0 8 9.5a4.5 4.5 0 0 0-3.898 2.25a.5.5 0 0 0 .183.683M7 6.5C7 7.328 6.552 8 6 8s-1-.672-1-1.5S5.448 5 6 5s1 .672 1 1.5m4 0c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S9.448 5 10 5s1 .672 1 1.5"/>'},
  { value: 2, icon: '<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M4 10.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 0-1h-7a.5.5 0 0 0-.5.5m3-4C7 5.672 6.552 5 6 5s-1 .672-1 1.5S5.448 8 6 8s1-.672 1-1.5m4 0c0-.828-.448-1.5-1-1.5s-1 .672-1 1.5S9.448 8 10 8s1-.672 1-1.5"/>' },
  { value: 3, icon: '<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M11.315 10.014a.5.5 0 0 1 .548.736A4.5 4.5 0 0 1 7.965 13a4.5 4.5 0 0 1-3.898-2.25a.5.5 0 0 1 .548-.736h.005l.017.005l.067.015l.252.055c.215.046.515.108.857.169c.693.124 1.522.242 2.152.242s1.46-.118 2.152-.242a27 27 0 0 0 1.109-.224l.067-.015l.017-.004l.005-.002zM4.756 4.566c.763-1.424 4.02-.12.952 3.434c-4.496-1.596-2.35-4.298-.952-3.434m6.488 0c1.398-.864 3.544 1.838-.952 3.434c-3.067-3.554.19-4.858.952-3.434"/>' },
];

async function processSubmit(isSubmitted: boolean) {

  // User closes the dialog in the first step.
  if (selectedRate.value == 0 || !isSubmitted) {

    // User chooses the rate icon but closes the dialog.
    if (!showReviewTextarea.value)
      selectedRate.value = 0;

    await submitRate();
    return;
  }

  // User chooses rate 3 and submits the dialog.
  if (selectedRate.value == 3) {
    showReviewThanks.value = true;
    await Util.delay(1500);
    await submitRate();
    return;
  }

  // User chooses rate 1 or 2 and submits the dialog.
  showReviewTextarea.value = true;
}

async function submitRate() {
  // Close dialog
  vhApp.data.state.userReviewRecommended = 0;

  try {
    const userReview = new AppUserReview(
      {
        rating: selectedRate.value,
        reviewText: userReviewText.value ?? ""
      }
    )

    await vhApp.appClient.setUserReview(userReview);
    await vhApp.reloadState();

    // Show the Google Play dialog if the user rates 3. The store's prompt opens on the device the
    // app is on; from a phone managing a TV, that is the TV.
    if (selectedRate.value == 3)
      await vhApp.withContinueOnTv(() => vhApp.intentsClient.requestUserReview());

    // Production mode only
    if (!import.meta.env.DEV)
      await sendToFirebase();
  }
  catch (err) {
    console.error('Error submitting user review:', err);
  }
  finally {
    selectedRate.value = 0;
    userReviewText.value = null;
    showReviewThanks.value = false;
  }
}

async function sendToFirebase(): Promise<void> {
  const clientId = vhApp.data.features.clientId.substring(0, 8);
  await vhApp.vhFirebase?.sendRate(userReviewText.value, clientId, 'rates', selectedRate.value);
}

function isShowCloseBtn(): boolean{
  return !((!showReviewTextarea.value && vhApp.data.state.userReviewRecommended == 2) || showReviewThanks.value);

}

</script>

<template>
  <v-dialog
    :modelValue="props.modelValue"
    @update:modelValue="$emit('update:modelValue',$event)"
    persistent
  >
    <v-card color="general-dialog" class="border border-rate-dialog-border border-opacity-100">

      <!-- Close button -->
      <tonal-icon-btn
        v-if="isShowCloseBtn()"
        icon="mdi-close"
        class="position-absolute ms-3 mt-3"
        style="z-index: 999"
        @click="processSubmit(false)"
      />

      <div v-if="!showReviewTextarea && !showReviewThanks">
        <v-card-item>
          <v-card-title class="text-headline-small font-weight-regular text-center mb-4">{{locale('FEEDBACK')
            }}</v-card-title>
        </v-card-item>

        <v-card-text class="text-body-large">{{locale('FEEDBACK_DESC')}}</v-card-text>

        <v-card-item>

          <v-btn-toggle
            v-model="selectedRate"
            mandatory
            base-color="rate-icon"
            class="d-flex justify-center ga-7"
            style="height: 60px"
          >
            <v-btn
              v-for="rate in rates"
              :key="rate.value"
              :value="rate.value"
              :class="[selectedRate === 0 || selectedRate === rate.value ? 'opacity-100' : 'opacity-40']"
              variant="plain"
              rounded="circle"
              width="60px"
              height="60px"
              flat
              icon
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 16 16">
                <!--suppress HtmlDeprecatedAttribute -->
                <g fill="currentColor" v-html="rate.icon"></g>
              </svg>
            </v-btn>
          </v-btn-toggle>

        </v-card-item>
      </div>


      <v-card-item v-else-if="showReviewTextarea" class="pb-0">
        <div class="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24">
            <mask id="lineMdEmojiCry0"><g stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1"><path stroke-dasharray="64" stroke-dashoffset="64" d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.48s" values="64;0"/></path><path stroke-dasharray="2" stroke-dashoffset="2" d="M9 9v1"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.56s" dur="0.16s" values="2;0"/></path><path stroke-dasharray="2" stroke-dashoffset="2" d="M15 9v1"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.72s" dur="0.16s" values="2;0"/></path><path stroke-dasharray="12" stroke-dashoffset="12" d="M8 16c0.5 -1 1.79 -2 4 -2c2.21 0 3.5 1 4 2"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.88s" dur="0.16s" values="12;0"/></path><path fill="#000" fill-opacity="0" stroke="none" d="M9.55 12c1.19 1.88 2.45 4.18 2.45 5.5c0 2.5 -2 4.5 -4.5 4.5c-2.5 0 -4.5 -2 -4.5 -4.5c0 -1.32 1.26 -3.62 2.45 -5.5Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.72s" dur="0.16s" values="0;1"/></path><path fill="#fff" fill-opacity="0" stroke="none" d="M7.5 13c0 0 2.5 3.12 2.5 4.5c0 1.38 -1.12 2.5 -2.5 2.5c-1.38 0 -2.5 -1.12 -2.5 -2.5c0 -1.38 2.5 -4.5 2.5 -4.5Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.72s" dur="0.16s" values="0;1"/></path></g></mask><rect width="24" height="24" fill="currentColor" mask="url(#lineMdEmojiCry0)"/>
          </svg>
        </div>
        <p class="mb-3 text-label-large">{{locale("USER_REVIEW_SORRY_MSG")}}</p>
        <v-textarea
          v-model="userReviewText"
          maxLength="500"
          density="compact"
          counter="500"
          clearable
          rows= "3"
          autofocus
          variant="outlined"
          color="highlight"
          :placeholder="locale('USER_REVIEW_TEXT_PLACEHOLDER')"
        />
      </v-card-item>

      <v-card-item v-else-if="showReviewThanks" class="text-center">
        <svg class="text-rate-dialog-thanks mb-2" xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24">
          <path fill="currentColor" fill-opacity="0" d="M12 8c0 0 0 0 0.76 -1c0.88 -1.16 2.18 -2 3.74 -2c2.49 0 4.5 2.01 4.5 4.5c0 0.93 -0.28 1.79 -0.76 2.5c-0.81 1.21 -8.24 9 -8.24 9c0 0 -7.43 -7.79 -8.24 -9c-0.48 -0.71 -0.76 -1.57 -0.76 -2.5c0 -2.49 2.01 -4.5 4.5 -4.5c1.56 0 2.87 0.84 3.74 2c0.76 1 0.76 1 0.76 1Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.56s" dur="0.4s" values="0;1"/></path><path fill="none" stroke="currentColor" stroke-dasharray="32" stroke-dashoffset="32" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 8c0 0 0 0 -0.76 -1c-0.88 -1.16 -2.18 -2 -3.74 -2c-2.49 0 -4.5 2.01 -4.5 4.5c0 0.93 0.28 1.79 0.76 2.5c0.81 1.21 8.24 9 8.24 9M12 8c0 0 0 0 0.76 -1c0.88 -1.16 2.18 -2 3.74 -2c2.49 0 4.5 2.01 4.5 4.5c0 0.93 -0.28 1.79 -0.76 2.5c-0.81 1.21 -8.24 9 -8.24 9"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.56s" values="32;0"/></path>
        </svg>
        <p class="text-rate-dialog-thanks mb-3">{{locale("USER_REVIEW_GLAD_MSG")}}</p>
        <p class="mb-3">{{locale("THANK_YOU")}}</p>
      </v-card-item>

      <!-- Later/Cancel & Submit buttons -->
      <v-card-item v-if="!showReviewThanks" class="text-end mt-3">
        <!-- iOS only: App Review requires the prompt to be dismissible; other platforms keep the flow as is. -->
        <v-btn
          v-if="vhApp.data.features.osType === AppOsType.Ios"
          variant="text"
          rounded="pill"
          class="me-2"
          :text="showReviewTextarea ? locale('CANCEL') : locale('LATER')"
          @click="processSubmit(false)"
        />
        <btn-style-2
          v-if="!showReviewTextarea"
          :text="locale('SUBMIT')"
          :disabled="selectedRate === 0"
          @click="processSubmit(true)"
        />
        <btn-style-2
          v-else
          :text="locale('SEND')"
          :disabled="!userReviewText || userReviewText?.trim().length == 0"
          @click="submitRate()"
        />
      </v-card-item>

    </v-card>
  </v-dialog>
</template>
