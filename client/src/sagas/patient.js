import { all, put, takeLatest } from 'redux-saga/effects';

import * as actions from '../actions/type';
import { success, error } from '../actions/app';
import Api, { ApiError } from '../helpers/api';


function* fetch(action) {
  try {
    yield put({ type: actions.START_LOADING_ANIMATION });
    const patientResponse = yield Api.getPatientById(action.payload.uid);
    if (patientResponse.error) {
      throw new ApiError(patientResponse.error);
    }
    yield put({ type: actions.PATIENT_FETCH_SUCCEEDED, payload: patientResponse.payload.data });
    yield put(success(window.CLIN.translate({ id: 'message.success.generic' })));
    yield put({ type: actions.STOP_LOADING_ANIMATION });
  } catch (e) {
    yield put({ type: actions.PATIENT_FETCH_FAILED, payload: e });
    yield put(error(window.CLIN.translate({ id: 'message.error.generic' })));
    yield put({ type: actions.STOP_LOADING_ANIMATION });
  }
}

function* search(action) {
  try {
    yield put({ type: actions.START_LOADING_ANIMATION });
    let response = null;

    if (!action.payload || !action.payload.query) {
      response = yield Api.getAllPatients();
    } else {
      response = yield Api.searchAllPatients(action.payload.query);
    }
    if (response.error) {
      throw new ApiError(response.error);
    }
    yield put({ type: actions.PATIENT_SEARCH_SUCCEEDED, payload: response.payload });
    yield put(success(window.CLIN.translate({ id: 'message.success.generic' })));
    yield put({ type: actions.STOP_LOADING_ANIMATION });
  } catch (e) {
    yield put({ type: actions.PATIENT_SEARCH_FAILED, payload: e });
    yield put(error(window.CLIN.translate({ id: 'message.error.generic' })));
    yield put({ type: actions.STOP_LOADING_ANIMATION });
  }
}

function* watchPatientFetch() {
  yield takeLatest(actions.PATIENT_FETCH_REQUESTED, fetch);
}

function* watchPatientSearch() {
  yield takeLatest(actions.PATIENT_SEARCH_REQUESTED, search);
}

export default function* watchedPatientSagas() {
  yield all([
    watchPatientFetch(),
    watchPatientSearch(),
  ]);
}
