/**
 * localStorage缓存登录用户的相关数据
 */
starter.factory('Storage', function () {
  var base_data_funcs = "base_data_funcs";
  var base_data_has_done = "base_data_has_done";//标识基础数据是否已经初始化完全
  var user_token = "USER_TOKEN";
  var last_login_date = "LAST_LOGIN_DATE";
  var user_profile = "USER_PROFILE";
  var user_project = "USER_PROJECTS";
  var user_companies = "USER_COMPANIES";
  var user_repertory = "USER_REPERTORY";
  var selected_project='SELECTED_PROJECT';//全局变量，用户选择的项目
  var selected_company='SELECTED_COMPANY';//全局变量，用户选择的公司
  var CURRENT_APP_VERSION = 'CURRENT_APP_VERSION';
  function set(key, data) {
    return window.localStorage.setItem(key, window.JSON.stringify(data));
  }
  function get(key) {
    var model = window.localStorage.getItem(key);
    if (model == "undefined") {
      return null;
    } else {
      return window.JSON.parse(model);
    }
  }

  function remove(key) {
    return window.localStorage.removeItem(key);
  }
  return {
    set: function (key, data) {
      return set(key, data);
    },
    get: function (key) {
      return get(key);
    },
    remove: function (key) {
      remove(key);
    },
    /**
     * 取得token
     */
    getAccessToken: function () {
      return get(user_token);
    },
    /**
     * 是否是现场经理
     */
    isManager: function () {
      var profile = get(user_profile);
      return true ||!!(profile && profile['roleNames'] && profile['roleNames'].indexOf("现场经理") >= 0);
    },
    /**
     * 设置token
     * @param {Object} token
     */
    setAccessToken: function (token) {
      return set(user_token, token);
    },
    /**
     * 设置登录成功后的时间
     */
    setLastLoginDate: function (date) {
      return set(last_login_date, date);
    },
    /**
     * 获取上一次登录成功后的时间
     */
    getLastLoginDate: function () {
      return get(last_login_date);
    },

    /**
     * 缓存profile,用户信息
     * @param {Object} profile
     */
    setProfile: function (profile) {
      return set(user_profile, profile);
    },

    /**
     * 获取缓存的profile
     */
    getProfile: function () {
      return get(user_profile);
    },
    /**
     * 缓存用户项目信息
     * @param {Object} profile
     */
    setProjects: function (projects) {
      return set(user_project, projects);
    },
    /**
     * 获取缓存的用户项目信息
     */
    getProjects: function () {
      return get(user_project);
    },
    /**
     * 缓存库存信息
     * @param {Object} repertorys
     */
    setRepertory: function (repertorys) {
      return set(user_repertory, repertorys);
    },
    /**
     * 缓存库存信息
     */
    getRepertory: function () {
      return get(user_repertory);
    },
    /**
     * 设置用户登录后选择的项目
     * @param selectedProject
     * @returns {*}
     */
    setSelectedProject:function (selectedProject) {
      return set(selected_project,selectedProject);
    },
    /**
     * 获取用户选择的项目
     * @returns {*|{}}
     */
    getSelectedProject:function () {
      return get(selected_project);
    },
    /**
     * 设置用户登录后选择的公司
     * @param selectedProject
     * @returns {*}
     */
    setSelectedCompany:function (selectedCompany) {
      return set(selected_company,selectedCompany);
    },
    /**
     * 获取用户选择的公司
     * @returns {*|{}}
     */
    getSelectedCompany:function () {
      return get(selected_company);
    },
    /**
     * 设置公司
     * @param companies
     * @returns {*}
     */
    setCompanies:function (companies) {
      return set(user_companies,companies);
    },
    /**
     * 获取公司
     * @returns {*}
     */
    getCompanies:function () {
      return get(user_companies);
    },
    getCurrentAppVersion:function () {
      return get(CURRENT_APP_VERSION);
    },
    setCurrentAppVersion:function (version) {
      return set(CURRENT_APP_VERSION,version);
    }
  };
});
